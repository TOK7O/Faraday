using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Faraday.API.DTOs;
using Faraday.API.Services.Interfaces;

namespace Faraday.API.Services;

public class VoiceCommandService(
    IProductService productService,
    IOperationService operationService,
    IRackService rackService,
    IReportService reportService,
    IConfiguration configuration,
    ILogger<VoiceCommandService> logger,
    IHttpClientFactory httpClientFactory)
    : IVoiceCommandService
{
    private readonly HttpClient _httpClient = httpClientFactory.CreateClient();

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = false
    };

    #region Public API

    public async Task<VoiceCommandResponseDto> ProcessVoiceCommandAsync(string commandText, int userId)
    {
        try
        {
            logger.LogInformation("Voice command received: \"{Command}\" from user {UserId}", commandText, userId);

            var (functionName, arguments) = await GetFunctionCallFromGeminiAsync(commandText);

            if (string.IsNullOrEmpty(functionName))
            {
                logger.LogWarning("Gemini did not return a function call for: \"{Command}\"", commandText);
                return new VoiceCommandResponseDto
                {
                    Success = false,
                    Message = "Nie udało mi się zrozumieć tej komendy. Spróbuj powiedzieć ją inaczej."
                };
            }

            logger.LogInformation("Gemini selected function: {Function} with args: {Args}",
                functionName, JsonSerializer.Serialize(arguments));

            var (actionResult, resultData) = await DispatchFunctionAsync(functionName, arguments, userId);

            var summary = await GenerateNaturalResponseAsync(commandText, functionName, actionResult);

            return new VoiceCommandResponseDto
            {
                Success = true,
                Message = summary,
                ActionPerformed = functionName,
                Data = resultData
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error processing voice command: \"{Command}\"", commandText);
            return new VoiceCommandResponseDto
            {
                Success = false,
                Message = $"Wystąpił błąd podczas przetwarzania komendy: {ex.Message}"
            };
        }
    }

    #endregion

    #region Gemini Communication

    private string GetApiKey()
    {
        var apiKey = configuration["Gemini:ApiKey"];
        if (string.IsNullOrEmpty(apiKey) || apiKey == "YOUR_GEMINI_API_KEY_HERE")
            throw new InvalidOperationException("Gemini API Key is not configured");
        return apiKey;
    }

    private string GetModel() => configuration["Gemini:Model"] ?? "gemini-2.5-flash";

    private string GetApiUrl() =>
        $"https://generativelanguage.googleapis.com/v1beta/models/{GetModel()}:generateContent?key={GetApiKey()}";

    private async Task<(string? functionName, Dictionary<string, JsonElement> arguments)>
        GetFunctionCallFromGeminiAsync(string commandText)
    {
        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    role = "user",
                    parts = new[] { new { text = commandText } }
                }
            },
            systemInstruction = new
            {
                parts = new[]
                {
                    new
                    {
                        text = """
                            Jesteś asystentem głosowym systemu zarządzania magazynem Faraday WMS.
                            Użytkownicy mówią do ciebie po polsku lub angielsku - komendy dotyczą operacji magazynowych.
                            Twoim zadaniem jest dobrać odpowiednią funkcję (tool) do wykonania komendy użytkownika.
                            Jeśli komenda nie dotyczy operacji magazynowych lub nie pasuje do żadnej dostępnej funkcji, nie wywołuj żadnej funkcji.
                            """
                    }
                }
            },
            tools = new[] { new { functionDeclarations = BuildToolDeclarations() } },
            toolConfig = new
            {
                functionCallingConfig = new
                {
                    mode = "AUTO"
                }
            },
            generationConfig = new
            {
                temperature = 0.0
            }
        };

        var responseBody = await CallGeminiApiAsync(requestBody);

        var response = JsonSerializer.Deserialize<JsonElement>(responseBody);

        var candidates = response.GetProperty("candidates");
        if (candidates.GetArrayLength() == 0)
            return (null, new Dictionary<string, JsonElement>());

        var parts = candidates[0].GetProperty("content").GetProperty("parts");

        foreach (var part in parts.EnumerateArray())
        {
            if (!part.TryGetProperty("functionCall", out var functionCall)) continue;
            var name = functionCall.GetProperty("name").GetString();
            var args = new Dictionary<string, JsonElement>();

            if (functionCall.TryGetProperty("args", out var argsElement))
            {
                foreach (var prop in argsElement.EnumerateObject())
                {
                    args[prop.Name] = prop.Value.Clone();
                }
            }

            return (name, args);
        }

        return (null, new Dictionary<string, JsonElement>());
    }

    private async Task<string> GenerateNaturalResponseAsync(
        string originalCommand, string functionName, object result)
    {
        var resultJson = JsonSerializer.Serialize(result, JsonOptions);

        // Truncate very large results for the summarization call
        if (resultJson.Length > 4000)
            resultJson = resultJson[..4000] + "... (dane obcięte)";

        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    role = "user",
                    parts = new[]
                    {
                        new
                        {
                            text = $"""
                                Użytkownik wydał komendę głosową: "{originalCommand}"
                                Wykonana funkcja: {functionName}
                                Wynik: {resultJson}

                                Wygeneruj krótkie, naturalne podsumowanie wyniku po polsku (1-2 zdania).
                                Jeśli wynik to lista, podaj liczbę elementów i kilka przykładów.
                                Jeśli wynik to statystyki, podaj kluczowe liczby.
                                Nie używaj formatowania markdown. Odpowiadaj tak jakbyś mówił do kogoś.
                                """
                        }
                    }
                }
            },
            generationConfig = new
            {
                temperature = 0.3,
                maxOutputTokens = 300
            }
        };

        try
        {
            var responseBody = await CallGeminiApiAsync(requestBody);
            var response = JsonSerializer.Deserialize<JsonElement>(responseBody);

            return response
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString() ?? "Operacja zakończona pomyślnie.";
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to generate natural response, using fallback");
            return "Operacja zakończona pomyślnie.";
        }
    }

    private async Task<string> CallGeminiApiAsync(object requestBody)
    {
        var jsonContent = JsonSerializer.Serialize(requestBody, JsonOptions);
        var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

        logger.LogDebug("Calling Gemini API");
        var response = await _httpClient.PostAsync(GetApiUrl(), content);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("Gemini API error: {StatusCode} - {Response}", response.StatusCode, responseBody);
            throw new InvalidOperationException($"Gemini API returned error: {response.StatusCode}");
        }

        return responseBody;
    }

    #endregion

    #region Tool Declarations

    private static object[] BuildToolDeclarations()
    {
        return
        [
            new
            {
                name = "get_dashboard_stats",
                description =
                    "Pobiera ogólne statystyki magazynu: zajętość slotów, wagę, liczbę operacji dzisiaj, liczbę towarów z kończącym się terminem ważności. Użyj gdy użytkownik pyta o stan magazynu, statystyki, obłożenie, podsumowanie.",
                parameters = new
                {
                    type = "object",
                    properties = new { },
                    required = Array.Empty<string>()
                }
            },
            new
            {
                name = "get_inventory_summary",
                description =
                    "Pobiera podsumowanie stanów magazynowych pogrupowane po produktach - ile sztuk każdego produktu jest w magazynie. Użyj gdy użytkownik pyta o stan magazynowy, inwentarz, co jest na stanie, jakie produkty mamy.",
                parameters = new
                {
                    type = "object",
                    properties = new { },
                    required = Array.Empty<string>()
                }
            },
            new
            {
                name = "get_expiring_items",
                description =
                    "Pobiera listę towarów z kończącym się terminem ważności. Użyj gdy użytkownik pyta o produkty które wygasają, przeterminowane, kończący się termin ważności.",
                parameters = new
                {
                    type = "object",
                    properties = new
                    {
                        days = new
                        {
                            type = "integer",
                            description =
                                "Liczba dni do przodu do sprawdzenia. Domyślnie 7 jeśli użytkownik nie podał."
                        }
                    },
                    required = Array.Empty<string>()
                }
            },
            new
            {
                name = "get_active_alerts",
                description =
                    "Pobiera listę aktywnych (nierozwiązanych) alarmów w magazynie. Użyj gdy użytkownik pyta o alarmy, ostrzeżenia, problemy, alerty.",
                parameters = new
                {
                    type = "object",
                    properties = new { },
                    required = Array.Empty<string>()
                }
            },
            new
            {
                name = "get_rack_utilization",
                description =
                    "Pobiera informacje o wykorzystaniu regałów - procent zajętości slotów i wagi każdego regału. Użyj gdy użytkownik pyta o wykorzystanie regałów, obłożenie regałów, wolne miejsce na regałach.",
                parameters = new
                {
                    type = "object",
                    properties = new { },
                    required = Array.Empty<string>()
                }
            },
            new
            {
                name = "get_all_products",
                description =
                    "Pobiera listę wszystkich zdefiniowanych produktów (katalog asortymentu). Użyj gdy użytkownik pyta o produkty, listę produktów, katalog, asortyment.",
                parameters = new
                {
                    type = "object",
                    properties = new { },
                    required = Array.Empty<string>()
                }
            },
            new
            {
                name = "get_product_by_barcode",
                description =
                    "Wyszukuje produkt po kodzie kreskowym (barcode/scanCode). Użyj gdy użytkownik pyta o konkretny produkt podając jego kod.",
                parameters = new
                {
                    type = "object",
                    properties = new
                    {
                        barcode = new
                        {
                            type = "string",
                            description = "Kod kreskowy (barcode/scanCode) produktu"
                        }
                    },
                    required = new[] { "barcode" }
                }
            },
            new
            {
                name = "get_all_racks",
                description =
                    "Pobiera listę wszystkich regałów w magazynie. Użyj gdy użytkownik pyta o regały, strukturę magazynu, ile mamy regałów.",
                parameters = new
                {
                    type = "object",
                    properties = new { },
                    required = Array.Empty<string>()
                }
            },
            new
            {
                name = "inbound_product",
                description =
                    "Przyjmuje towar do magazynu - automatycznie przydziela miejsce na regale. Użyj gdy użytkownik chce przyjąć towar, dodać produkt do magazynu, zrobić inbound. Wymaga kodu kreskowego produktu.",
                parameters = new
                {
                    type = "object",
                    properties = new
                    {
                        barcode = new
                        {
                            type = "string",
                            description = "Kod kreskowy produktu do przyjęcia"
                        }
                    },
                    required = new[] { "barcode" }
                }
            },
            new
            {
                name = "outbound_product",
                description =
                    "Wydaje towar z magazynu (FIFO - najstarszy najpierw). Użyj gdy użytkownik chce wydać towar, usunąć produkt z magazynu, zrobić outbound, wypuścić towar.",
                parameters = new
                {
                    type = "object",
                    properties = new
                    {
                        barcode = new
                        {
                            type = "string",
                            description = "Kod kreskowy produktu do wydania"
                        }
                    },
                    required = new[] { "barcode" }
                }
            },
            new
            {
                name = "get_operation_history",
                description =
                    "Pobiera historię operacji magazynowych (przyjęcia, wydania, przesunięcia). Użyj gdy użytkownik pyta o historię operacji, ostatnie operacje, logi.",
                parameters = new
                {
                    type = "object",
                    properties = new
                    {
                        limit = new
                        {
                            type = "integer",
                            description = "Maksymalna liczba rekordów do pobrania. Domyślnie 20."
                        }
                    },
                    required = Array.Empty<string>()
                }
            },
            new
            {
                name = "get_full_inventory",
                description =
                    "Pobiera pełny raport inwentaryzacyjny ze szczegółami każdego towaru w magazynie - lokalizacja, status, daty ważności, temperatura. Użyj gdy użytkownik pyta o pełny inwentarz, szczegółowy raport, pełną listę towarów w magazynie.",
                parameters = new
                {
                    type = "object",
                    properties = new { },
                    required = Array.Empty<string>()
                }
            }
        ];
    }

    #endregion

    #region Function Dispatch

    private async Task<(object result, object? displayData)> DispatchFunctionAsync(
        string functionName, Dictionary<string, JsonElement> args, int userId)
    {
        switch (functionName)
        {
            case "get_dashboard_stats":
            {
                var stats = await reportService.GetDashboardStatsAsync();
                return (stats, stats);
            }

            case "get_inventory_summary":
            {
                var summary = await reportService.GetInventorySummaryAsync();
                return (summary, summary);
            }

            case "get_expiring_items":
            {
                var days = args.TryGetValue("days", out var d) ? d.GetInt32() : 7;
                var items = await reportService.GetExpiringItemsAsync(days);
                return (items, items);
            }

            case "get_active_alerts":
            {
                var alerts = await reportService.GetActiveAlertsAsync();
                return (alerts, alerts);
            }

            case "get_rack_utilization":
            {
                var utilization = await reportService.GetRackUtilizationAsync();
                return (utilization, utilization);
            }

            case "get_all_products":
            {
                var products = await productService.GetAllProductsAsync();
                return (products, products);
            }

            case "get_product_by_barcode":
            {
                var barcode = args["barcode"].GetString()!;
                var product = await productService.GetProductByScanCodeAsync(barcode);
                if (product == null)
                    throw new InvalidOperationException($"Nie znaleziono produktu o kodzie: {barcode}");
                return (product, product);
            }

            case "get_all_racks":
            {
                var racks = await rackService.GetAllRacksAsync();
                return (racks, racks);
            }

            case "inbound_product":
            {
                var barcode = args["barcode"].GetString()!;
                var result = await operationService.ProcessInboundAsync(
                    new OperationInboundDto { Barcode = barcode }, userId);
                return (result, result);
            }

            case "outbound_product":
            {
                var barcode = args["barcode"].GetString()!;
                var result = await operationService.ProcessOutboundAsync(
                    new OperationOutboundDto { Barcode = barcode }, userId);
                return (result, result);
            }

            case "get_operation_history":
            {
                var limit = args.TryGetValue("limit", out var l) ? l.GetInt32() : 20;
                var history = await operationService.GetOperationHistoryAsync(limit);
                return (history, history);
            }

            case "get_full_inventory":
            {
                var inventory = await reportService.GetFullInventoryReportAsync();
                return (inventory, inventory);
            }

            default:
                throw new InvalidOperationException($"Nieznana funkcja: {functionName}");
        }
    }

    #endregion
}
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Faraday.API.Data;
using Faraday.API.DTOs;
using Faraday.API.Models;
using Faraday.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Faraday.API.Services
{
    public class VoiceCommandService : IVoiceCommandService
    {
        private readonly IProductService _productService;
        private readonly IOperationService _operationService;
        private readonly IRackService _rackService;
        private readonly IReportService _reportService;
        private readonly FaradayDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<VoiceCommandService> _logger;
        private readonly HttpClient _httpClient;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public VoiceCommandService(
            IProductService productService,
            IOperationService operationService,
            IRackService rackService,
            IReportService reportService,
            FaradayDbContext context,
            IConfiguration configuration,
            ILogger<VoiceCommandService> logger,
            IHttpClientFactory httpClientFactory,
            IHttpContextAccessor httpContextAccessor)
        {
            _productService = productService;
            _operationService = operationService;
            _rackService = rackService;
            _reportService = reportService;
            _context = context;
            _configuration = configuration;
            _logger = logger;
            _httpClient = httpClientFactory.CreateClient();
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<VoiceCommandResponseDto> ProcessVoiceCommandAsync(string commandText, int userId)
        {
            try
            {
                _logger.LogInformation("Processing voice command: {CommandText} for user {UserId}", commandText, userId);
                
                var executionPlan = await GetExecutionPlanFromGeminiAsync(commandText);

                if (executionPlan == null || !executionPlan.Steps.Any())
                {
                    _logger.LogWarning("No execution plan generated for command: {CommandText}", commandText);
                    return new VoiceCommandResponseDto
                    {
                        Success = false,
                        Message = "I couldn't understand that command. Could you please rephrase it?"
                    };
                }
                
                var result = await ExecutePlanAsync(executionPlan, userId);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing voice command: {CommandText}", commandText);
                return new VoiceCommandResponseDto
                {
                    Success = false,
                    Message = $"An error occurred while processing your command: {ex.Message}"
                };
            }
        }

        private async Task<VoiceExecutionPlanDto?> GetExecutionPlanFromGeminiAsync(string commandText)
        {
            try
            {
                var apiKey = _configuration["Gemini:ApiKey"];
                if (string.IsNullOrEmpty(apiKey) || apiKey == "YOUR_GEMINI_API_KEY_HERE")
                {
                    _logger.LogError("Gemini API Key is not configured properly");
                    throw new InvalidOperationException("Gemini API Key is not configured");
                }

                var model = _configuration["Gemini:Model"] ?? "gemini-2.0-flash-exp";
                var url = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

                var systemPrompt = BuildSystemPrompt();
                var fullPrompt = $"{systemPrompt}\n\nUser Command: \"{commandText}\"\n\nGenerate execution plan:";

                var requestBody = new
                {
                    contents = new[]
                    {
                        new
                        {
                            parts = new[]
                            {
                                new { text = fullPrompt }
                            }
                        }
                    },
                    generationConfig = new
                    {
                        temperature = 0.1,
                        maxOutputTokens = 2000
                    }
                };

                var jsonContent = JsonSerializer.Serialize(requestBody);
                var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

                _logger.LogDebug("Calling Gemini API with enhanced prompt");

                var response = await _httpClient.PostAsync(url, content);
                var responseBody = await response.Content.ReadAsStringAsync();

                _logger.LogDebug("Gemini raw response: {Response}", responseBody);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Gemini API error: {StatusCode} - {Response}", response.StatusCode, responseBody);
                    throw new InvalidOperationException($"Gemini API returned error: {response.StatusCode}");
                }

                var geminiResponse = JsonSerializer.Deserialize<JsonElement>(responseBody);
                var generatedText = geminiResponse
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString() ?? "{}";
                
                generatedText = CleanJsonResponse(generatedText);

                _logger.LogInformation("Gemini extracted plan: {Text}", generatedText);

                var plan = JsonSerializer.Deserialize<VoiceExecutionPlanDto>(generatedText, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return plan;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calling Gemini API for command: {CommandText}", commandText);
                return null;
            }
        }

        private async Task<VoiceCommandResponseDto> ExecutePlanAsync(VoiceExecutionPlanDto plan, int userId)
        {
            _logger.LogDebug("Starting execution plan with {StepCount} steps", plan.Steps.Count);
            var context = new VoiceExecutionContextDto();
            context.Variables["userId"] = userId;

            try
            {
                foreach (var step in plan.Steps.OrderBy(s => s.StepNumber))
                {
                    _logger.LogInformation("Executing step {StepNumber}: {Description}", step.StepNumber, step.Description);
                    
                    var stepResult = await ExecuteStepAsync(step, context, userId);
                    
                    if (!stepResult.success)
                    {
                        return new VoiceCommandResponseDto
                        {
                            Success = false,
                            Message = $"Step {step.StepNumber} failed: {stepResult.error}",
                            Data = context.ExecutionLog
                        };
                    }
                    
                    if (!string.IsNullOrEmpty(step.SaveResultAs) && stepResult.result != null)
                    {
                        context.Variables[step.SaveResultAs] = stepResult.result;
                        context.ExecutionLog.Add($"Step {step.StepNumber}: {step.Description} - Success");
                    }
                }
                
                var finalMessage = ReplaceVariables(plan.FinalResponseTemplate, context.Variables);

                return new VoiceCommandResponseDto
                {
                    Success = true,
                    Message = finalMessage,
                    ActionPerformed = "multi_step_execution",
                    Data = new
                    {
                        ExecutedSteps = plan.Steps.Count,
                        Log = context.ExecutionLog,
                        Results = context.Variables
                    }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing plan");
                return new VoiceCommandResponseDto
                {
                    Success = false,
                    Message = $"Execution failed: {ex.Message}",
                    Data = context.ExecutionLog
                };
            }
        }

        private async Task<(bool success, object? result, string? error)> ExecuteStepAsync(
            VoiceExecutionStepDto step, 
            VoiceExecutionContextDto context, 
            int userId)
        {
            try
            {
                var endpoint = ReplaceVariables(step.Endpoint, context.Variables);
                var parameters = ReplaceVariablesInDictionary(step.Parameters, context.Variables);

                _logger.LogDebug("Executing {Method} {Endpoint} with params: {Params}", 
                    step.Method, endpoint, JsonSerializer.Serialize(parameters));
                
                var result = await RouteToServiceAsync(step.Method, endpoint, parameters, userId);
                
                return (true, result, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing step {StepNumber}", step.StepNumber);
                return (false, null, ex.Message);
            }
        }

        private async Task<object?> RouteToServiceAsync(string method, string endpoint, Dictionary<string, object> parameters, int userId)
        {
            var parts = endpoint.TrimStart('/').Split('/');
            if (parts.Length < 2) throw new InvalidOperationException($"Invalid endpoint: {endpoint}");

            var controller = parts[1].ToLower();
            var action = parts.Length > 2 ? parts[2].ToLower() : "";
            _logger.LogTrace("Routing request: {Method} /{Controller}/{Action}", method, controller, action);

            switch (controller)
            {
                case "product":
                    return await HandleProductEndpoint(method, action, parameters);
                
                case "operation":
                    return await HandleOperationEndpoint(action, parameters, userId);
                
                case "rack":
                    return await HandleRackEndpoint(method, action, parameters);
                
                case "report":
                    return await HandleReportEndpoint(action, parameters);
                
                default:
                    throw new InvalidOperationException($"Unsupported controller: {controller}");
            }
        }

        private async Task<object?> HandleProductEndpoint(string method, string action, Dictionary<string, object> parameters)
        {
            switch (action)
            {
                case "scancode":
                    var scanCode = parameters.ContainsKey("scanCode") 
                        ? parameters["scanCode"].ToString() 
                        : parameters.Values.FirstOrDefault()?.ToString();
                    return await _productService.GetProductByScanCodeAsync(scanCode!);
                
                case "":
                    if (method == "GET")
                        return await _productService.GetAllProductsAsync();
                    break;
                
                default:
                    if (int.TryParse(action, out int productId))
                        return await _productService.GetProductByIdAsync(productId);
                    break;
            }
            
            throw new InvalidOperationException($"Unsupported product action: {action}");
        }

        private async Task<object?> HandleOperationEndpoint(string action, Dictionary<string, object> parameters, int userId)
        {
            switch (action)
            {
                case "inbound":
                    var inboundDto = new OperationInboundDto 
                    { 
                        Barcode = GetParameter<string>(parameters, "barcode") 
                    };
                    return await _operationService.ProcessInboundAsync(inboundDto, userId);
                
                case "outbound":
                    var outboundDto = new OperationOutboundDto 
                    { 
                        Barcode = GetParameter<string>(parameters, "barcode") 
                    };
                    return await _operationService.ProcessOutboundAsync(outboundDto, userId);
                
                case "move":
                    var moveDto = new OperationMovementDto
                    {
                        Barcode = GetParameter<string>(parameters, "barcode"),
                        SourceRackCode = GetParameter<string>(parameters, "sourceRackCode"),
                        SourceSlotX = GetParameter<int>(parameters, "sourceSlotX"),
                        SourceSlotY = GetParameter<int>(parameters, "sourceSlotY"),
                        TargetRackCode = GetParameter<string>(parameters, "targetRackCode"),
                        TargetSlotX = GetParameter<int>(parameters, "targetSlotX"),
                        TargetSlotY = GetParameter<int>(parameters, "targetSlotY")
                    };
                    return await _operationService.ProcessMovementAsync(moveDto, userId);
                
                case "history":
                    var limit = parameters.ContainsKey("limit") 
                        ? Convert.ToInt32(parameters["limit"]) 
                        : (int?)null;
                    return await _operationService.GetOperationHistoryAsync(limit);
                
                default:
                    throw new InvalidOperationException($"Unsupported operation action: {action}");
            }
        }

        private async Task<object?> HandleRackEndpoint(string method, string action, Dictionary<string, object> parameters)
        {
            switch (action)
            {
                case "":
                    if (method == "GET")
                        return await _rackService.GetAllRacksAsync();
                    break;
                
                default:
                    if (int.TryParse(action, out int rackId))
                        return await _rackService.GetRackByIdAsync(rackId);
                    break;
            }
            
            throw new InvalidOperationException($"Unsupported rack action: {action}");
        }

        private async Task<object?> HandleReportEndpoint(string action, Dictionary<string, object> parameters)
        {
            switch (action)
            {
                case "dashboard-stats":
                    return await _reportService.GetDashboardStatsAsync();
                
                case "inventory-summary":
                    return await _reportService.GetInventorySummaryAsync();
                
                case "expiring-items":
                    var days = parameters.ContainsKey("days") 
                        ? Convert.ToInt32(parameters["days"]) 
                        : 7;
                    return await _reportService.GetExpiringItemsAsync(days);
                
                case "rack-utilization":
                    return await _reportService.GetRackUtilizationAsync();
                
                case "full-inventory":
                    return await _reportService.GetFullInventoryReportAsync();
                
                case "active-alerts":
                    return await _reportService.GetActiveAlertsAsync();
                
                default:
                    throw new InvalidOperationException($"Unsupported report action: {action}");
            }
        }
        
        private T GetParameter<T>(Dictionary<string, object> parameters, string key)
        {
            if (!parameters.ContainsKey(key))
                throw new InvalidOperationException($"Missing required parameter: {key}");

            var value = parameters[key];
            
            if (value is JsonElement jsonElement)
            {
                return ConvertJsonElement<T>(jsonElement);
            }
            
            if (value is string strValue)
            {
                if (typeof(T) == typeof(string))
                    return (T)(object)strValue;
                if (typeof(T) == typeof(int))
                    return (T)(object)int.Parse(strValue);
                if (typeof(T) == typeof(decimal))
                    return (T)(object)decimal.Parse(strValue);
            }
            
            if (value is T typedValue)
                return typedValue;
            
            try
            {
                return (T)Convert.ChangeType(value, typeof(T));
            }
            catch
            {
                throw new InvalidOperationException($"Cannot convert parameter '{key}' of type {value.GetType().Name} to {typeof(T).Name}");
            }
        }
        
        private T ConvertJsonElement<T>(JsonElement element)
        {
            if (typeof(T) == typeof(string))
            {
                return (T)(object)(element.ValueKind == JsonValueKind.String ? element.GetString()! : element.ToString());
            }
            
            if (typeof(T) == typeof(int))
            {
                if (element.ValueKind == JsonValueKind.Number)
                    return (T)(object)element.GetInt32();
                if (element.ValueKind == JsonValueKind.String && int.TryParse(element.GetString(), out int intVal))
                    return (T)(object)intVal;
                throw new InvalidOperationException($"Cannot convert JsonElement to int: {element}");
            }
            
            if (typeof(T) == typeof(decimal))
            {
                if (element.ValueKind == JsonValueKind.Number)
                    return (T)(object)element.GetDecimal();
                if (element.ValueKind == JsonValueKind.String && decimal.TryParse(element.GetString(), out decimal decVal))
                    return (T)(object)decVal;
                throw new InvalidOperationException($"Cannot convert JsonElement to decimal: {element}");
            }
            
            if (typeof(T) == typeof(bool))
            {
                if (element.ValueKind == JsonValueKind.True || element.ValueKind == JsonValueKind.False)
                    return (T)(object)element.GetBoolean();
                throw new InvalidOperationException($"Cannot convert JsonElement to bool: {element}");
            }
            
            throw new InvalidOperationException($"Unsupported type conversion: {typeof(T).Name}");
        }
        private string ReplaceVariables(string template, Dictionary<string, object> variables)
        {
            var result = template;
            var regex = new Regex(@"\{\{([^}]+)\}\}");
            
            var matches = regex.Matches(template);
            foreach (Match match in matches)
            {
                var path = match.Groups[1].Value.Trim();
                var value = GetNestedValue(variables, path);
                result = result.Replace(match.Value, value?.ToString() ?? "null");
            }
            
            return result;
        }

        private Dictionary<string, object> ReplaceVariablesInDictionary(Dictionary<string, object> dict, Dictionary<string, object> variables)
        {
            var result = new Dictionary<string, object>();
    
            foreach (var kvp in dict)
            {
                var value = kvp.Value;
                
                if (value is JsonElement jsonElement)
                {
                    value = ConvertJsonElementToObject(jsonElement);
                }
                
                if (value is string str && str.Contains("{{"))
                {
                    result[kvp.Key] = ReplaceVariables(str, variables);
                }
                else
                {
                    result[kvp.Key] = value;
                }
            }
    
            return result;
        }
        private object ConvertJsonElementToObject(JsonElement element)
        {
            switch (element.ValueKind)
            {
                case JsonValueKind.String:
                    return element.GetString()!;
        
                case JsonValueKind.Number:
                    if (element.TryGetInt32(out int intVal))
                        return intVal;
                    if (element.TryGetInt64(out long longVal))
                        return longVal;
                    return element.GetDecimal();
        
                case JsonValueKind.True:
                    return true;
        
                case JsonValueKind.False:
                    return false;
        
                case JsonValueKind.Null:
                    return null!;
        
                case JsonValueKind.Object:
                    var dict = new Dictionary<string, object>();
                    foreach (var prop in element.EnumerateObject())
                    {
                        dict[prop.Name] = ConvertJsonElementToObject(prop.Value);
                    }
                    return dict;
        
                case JsonValueKind.Array:
                    var list = new List<object>();
                    foreach (var item in element.EnumerateArray())
                    {
                        list.Add(ConvertJsonElementToObject(item));
                    }
                    return list;
        
                default:
                    return element.ToString();
            }
        }
        private object? GetNestedValue(Dictionary<string, object> variables, string path)
        {
            var parts = path.Split('.');
            object? current = null;
    
            if (!variables.ContainsKey(parts[0]))
                return null;
    
            current = variables[parts[0]];
    
            for (int i = 1; i < parts.Length && current != null; i++)
            {
                var property = parts[i];
                
                if (current is JsonElement jsonElement)
                {
                    if (jsonElement.ValueKind == JsonValueKind.Object && jsonElement.TryGetProperty(property, out var nestedElement))
                    {
                        current = nestedElement;
                        continue;
                    }
                    return null;
                }
                
                if (current is Dictionary<string, object> dict)
                {
                    if (dict.ContainsKey(property))
                    {
                        current = dict[property];
                        continue;
                    }
                    return null;
                }
                
                var propInfo = current.GetType().GetProperty(property, 
                    System.Reflection.BindingFlags.Public | 
                    System.Reflection.BindingFlags.Instance | 
                    System.Reflection.BindingFlags.IgnoreCase);
        
                if (propInfo != null)
                {
                    current = propInfo.GetValue(current);
                }
                else
                {
                    return null;
                }
            }
            if (current is JsonElement finalElement)
            {
                return ConvertJsonElementToObject(finalElement);
            }
    
            return current;
        }

        private string CleanJsonResponse(string text)
        {
            text = text.Trim();
            
            if (text.StartsWith("```json"))
                text = text.Substring(7);
            else if (text.StartsWith("```"))
                text = text.Substring(3);
            
            if (text.EndsWith("```"))
                text = text.Substring(0, text.Length - 3);
            
            return text.Trim();
        }

        public string GetApiDocumentation()
        {
            return BuildSystemPrompt();
        }

        private string BuildSystemPrompt()
        {
            return @"You are an AI assistant for Faraday Warehouse Management System. Your role is to convert natural language commands into structured execution plans.

## AVAILABLE API ENDPOINTS:

### Products
- GET /api/product - Get all products
- GET /api/product/{id} - Get product by ID
- GET /api/product/scanCode/{scanCode} - Get product by barcode/QR code

### Operations
- POST /api/operation/inbound - Receive product into warehouse
  Parameters: { ""barcode"": ""string"" }
  
- POST /api/operation/outbound - Release product from warehouse
  Parameters: { ""barcode"": ""string"" }
  
- POST /api/operation/move - Move product between slots
  Parameters: { 
    ""barcode"": ""string"",
    ""sourceRackCode"": ""string"",
    ""sourceSlotX"": int,
    ""sourceSlotY"": int,
    ""targetRackCode"": ""string"",
    ""targetSlotX"": int,
    ""targetSlotY"": int
  }
  
- GET /api/operation/history?limit={int} - Get operation history

### Racks
- GET /api/rack - Get all racks
- GET /api/rack/{id} - Get rack by ID

### Reports
- GET /api/report/dashboard-stats - Get warehouse statistics
- GET /api/report/inventory-summary - Get inventory summary by product
- GET /api/report/expiring-items?days={int} - Get items expiring soon (default 7 days)
- GET /api/report/rack-utilization - Get rack usage statistics
- GET /api/report/full-inventory - Get complete inventory report
- GET /api/report/active-alerts - Get all active unresolved alerts

## OUTPUT FORMAT:

You MUST respond with ONLY a JSON object (no markdown, no explanations) in this exact format:

{
  ""steps"": [
    {
      ""stepNumber"": 1,
      ""method"": ""GET"",
      ""endpoint"": ""/api/product/scanCode/ABC123"",
      ""parameters"": {},
      ""saveResultAs"": ""product"",
      ""description"": ""Fetch product details by barcode""
    },
    {
      ""stepNumber"": 2,
      ""method"": ""POST"",
      ""endpoint"": ""/api/operation/inbound"",
      ""parameters"": { ""barcode"": ""{{product.scanCode}}"" },
      ""saveResultAs"": ""inboundResult"",
      ""description"": ""Receive product into warehouse""
    }
  ],
  ""finalResponseTemplate"": ""Product {{product.name}} has been received and stored in rack {{inboundResult.rackCode}} at slot [{{inboundResult.slotX}},{{inboundResult.slotY}}].""
}

## VARIABLE SUBSTITUTION:

Use {{variableName}} or {{variableName.property}} to reference data from previous steps.
Example: {{product.name}}, {{inboundResult.rackCode}}

## EXAMPLES:

User: ""Receive product ABC123""
Response:
{
  ""steps"": [
    {
      ""stepNumber"": 1,
      ""method"": ""POST"",
      ""endpoint"": ""/api/operation/inbound"",
      ""parameters"": { ""barcode"": ""ABC123"" },
      ""saveResultAs"": ""result"",
      ""description"": ""Receive product into warehouse""
    }
  ],
  ""finalResponseTemplate"": ""Product received successfully. Stored in rack {{result.rackCode}} at position [{{result.slotX}},{{result.slotY}}].""
}

User: ""Show me warehouse statistics""
Response:
{
  ""steps"": [
    {
      ""stepNumber"": 1,
      ""method"": ""GET"",
      ""endpoint"": ""/api/report/dashboard-stats"",
      ""parameters"": {},
      ""saveResultAs"": ""stats"",
      ""description"": ""Fetch warehouse statistics""
    }
  ],
  ""finalResponseTemplate"": ""Warehouse status: {{stats.occupiedSlots}} of {{stats.totalSlots}} slots occupied ({{stats.occupancyPercentage}}% full). Total weight: {{stats.totalWeightKg}}kg. {{stats.expiringItemsCount}} items expiring soon.""
}

User: ""What items are expiring in next 3 days?""
Response:
{
  ""steps"": [
    {
      ""stepNumber"": 1,
      ""method"": ""GET"",
      ""endpoint"": ""/api/report/expiring-items"",
      ""parameters"": { ""days"": 3 },
      ""saveResultAs"": ""items"",
      ""description"": ""Get items expiring in 3 days""
    }
  ],
  ""finalResponseTemplate"": ""Found expiring items in the next 3 days. Check the detailed list in response data.""
}

User: ""Release product XYZ789""
Response:
{
  ""steps"": [
    {
      ""stepNumber"": 1,
      ""method"": ""POST"",
      ""endpoint"": ""/api/operation/outbound"",
      ""parameters"": { ""barcode"": ""XYZ789"" },
      ""saveResultAs"": ""result"",
      ""description"": ""Release product from warehouse""
    }
  ],
  ""finalResponseTemplate"": ""Product released successfully from rack {{result.rackCode}} at position [{{result.slotX}},{{result.slotY}}].""
}

User: ""Show me all products""
Response:
{
  ""steps"": [
    {
      ""stepNumber"": 1,
      ""method"": ""GET"",
      ""endpoint"": ""/api/product"",
      ""parameters"": {},
      ""saveResultAs"": ""products"",
      ""description"": ""Get all products""
    }
  ],
  ""finalResponseTemplate"": ""Retrieved all products from the system. Check response data for details.""
}

User: ""Are there any alerts?""
Response:
{
  ""steps"": [
    {
      ""stepNumber"": 1,
      ""method"": ""GET"",
      ""endpoint"": ""/api/report/active-alerts"",
      ""parameters"": {},
      ""saveResultAs"": ""alerts"",
      ""description"": ""Get active alerts""
    }
  ],
  ""finalResponseTemplate"": ""Active alerts retrieved. Check response data for details.""
}

## RULES:
1. ALWAYS return ONLY valid JSON - no markdown, no explanations, no text before or after
2. Use multiple steps when you need information from one endpoint to use in another
3. Reference previous step results using {{variableName.property}} syntax
4. Keep finalResponseTemplate natural and user-friendly
5. Use appropriate HTTP methods (GET for queries, POST for actions)
6. For parameters in GET requests, include them in the parameters object
7. If command is unclear or impossible, still return valid JSON with an appropriate error message in finalResponseTemplate
8. Always use lowercase for method names (get, post, put, delete)
9. Endpoints must start with /api/
10. Parameter values can use {{variable}} substitution from previous steps";
        }
    }
}
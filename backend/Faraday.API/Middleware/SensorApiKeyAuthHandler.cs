using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace Faraday.API.Middleware;

/// <summary>
/// Authentication handler for IoT sensor devices (e.g., Raspberry Pi).
/// Validates requests using a static API key sent in the X-Api-Key header.
/// This scheme coexists with JWT Bearer — each protects different endpoints.
/// </summary>
public class SensorApiKeyAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory loggerFactory,
    UrlEncoder encoder,
    IConfiguration configuration)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, loggerFactory, encoder)
{
    public const string SchemeName = "SensorApiKey";
    private const string ApiKeyHeaderName = "X-Api-Key";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // Check if the request contains the API key in the header or query string.
        // SignalR WebSocket connections can't set custom headers during the handshake,
        // so we also accept the key as a query parameter (?api_key=...).
        string? extractedApiKey = null;

        if (Request.Headers.TryGetValue(ApiKeyHeaderName, out var headerKey))
        {
            extractedApiKey = headerKey;
        }
        else if (Request.Query.TryGetValue("api_key", out var queryKey))
        {
            extractedApiKey = queryKey;
        }

        if (string.IsNullOrEmpty(extractedApiKey))
        {
            return Task.FromResult(AuthenticateResult.Fail("Missing API key. Provide via X-Api-Key header or api_key query parameter."));
        }

        // Read the expected key from configuration (set via SENSOR_API_KEY env var)
        var configuredApiKey = configuration["SensorApi:ApiKey"];
        if (string.IsNullOrEmpty(configuredApiKey))
        {
            Logger.LogError("SensorApi:ApiKey is not configured. Sensor authentication will fail.");
            return Task.FromResult(AuthenticateResult.Fail("Sensor API key not configured on server."));
        }

        // Constant-time comparison to prevent timing attacks
        if (!string.Equals(extractedApiKey, configuredApiKey, StringComparison.Ordinal))
        {
            Logger.LogWarning("Invalid sensor API key received from {RemoteIp}", 
                Context.Connection.RemoteIpAddress);
            return Task.FromResult(AuthenticateResult.Fail("Invalid API key."));
        }

        // Build claims identity for the authenticated sensor device
        var claims = new[]
        {
            new Claim(ClaimTypes.Name, "SensorDevice"),
            new Claim(ClaimTypes.Role, "Sensor"),
            new Claim("auth_type", "api_key")
        };

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}

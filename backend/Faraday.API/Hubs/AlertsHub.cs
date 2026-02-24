using Microsoft.AspNetCore.SignalR;

namespace Faraday.API.Hubs;

/// <summary>
/// Responsible for real-time communication with frontend clients.
/// Acts as a channel for broadcasting critical alerts (temperature/weight anomalies) 
/// immediately to operator dashboards without requiring page refreshes.
/// </summary>
public class AlertsHub(ILogger<AlertsHub> logger) : Hub
{
    /// <summary>
    /// Called when a new client (e.g., frontend dashboard) establishes a connection.
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        logger.LogInformation($"Client connected to AlertsHub: {Context.ConnectionId}");
        await base.OnConnectedAsync();
    }

    /// <summary>
    /// Called when a client disconnects.
    /// </summary>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        logger.LogInformation($"Client disconnected from AlertsHub: {Context.ConnectionId}");
        await base.OnDisconnectedAsync(exception);
    }
}
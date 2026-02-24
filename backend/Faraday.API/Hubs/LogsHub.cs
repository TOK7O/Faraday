using Faraday.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Faraday.API.Hubs;

/// <summary>
/// Dedicated for streaming application logs in real-time to the Admin Dashboard.
/// Protected by RBAC to ensure operational data is only accessible to Administrators.
/// </summary>
[Authorize(Roles = "Administrator")]
public class LogsHub(ILogger<LogsHub> logger, ILogsService logsService) : Hub
{
    /// <summary>
    /// Handles the initial connection of an administrator.
    /// Immediately pushes the recent log history so the terminal window is populated upon load.
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        // Identity is available here because of the [Authorize] attribute on the class.
        var username = Context.User?.Identity?.Name ?? "Unknown";
        logger.LogInformation("Admin user {Username} connected to LogsHub. ConnectionId: {ConnectionId}", 
            username, Context.ConnectionId);
            
        // Send recent log history to newly connected client
        // This prevents the "empty console" effect when an admin first opens the page.
        var recentLogs = logsService.GetRecentLogs();
        await Clients.Caller.SendAsync("ReceiveLogHistory", recentLogs);
            
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var username = Context.User?.Identity?.Name ?? "Unknown";
        logger.LogInformation("Admin user {Username} disconnected from LogsHub. ConnectionId: {ConnectionId}", 
            username, Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    // Client can request specific log level filtering
    /// <summary>
    /// Allows the client to subscribe to specific log levels.
    /// This enables backend-side filtering to reduce network traffic if the user only wants to see 'Errors'.
    /// </summary>
    public async Task SetLogLevelFilter(string logLevel)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"LogLevel_{logLevel}");
        logger.LogDebug("User {ConnectionId} subscribed to {LogLevel} logs", 
            Context.ConnectionId, logLevel);
    }
}
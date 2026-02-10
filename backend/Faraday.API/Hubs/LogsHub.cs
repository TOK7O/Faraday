using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using Faraday.API.Services.Interfaces;

namespace Faraday.API.Hubs
{
    /// <summary>
    /// Dedicated for streaming application logs in real-time to the Admin Dashboard.
    /// Protected by RBAC to ensure operational data is only accessible to Administrators.
    /// </summary>
    [Authorize(Roles = "Administrator")]
    public class LogsHub : Hub
    {
        private readonly ILogger<LogsHub> _logger;
        private readonly ILogsService _logsService;

        public LogsHub(ILogger<LogsHub> logger, ILogsService logsService)
        {
            _logger = logger;
            _logsService = logsService;
        }

        /// <summary>
        /// Handles the initial connection of an administrator.
        /// Immediately pushes the recent log history so the terminal window is populated upon load.
        /// </summary>
        public override async Task OnConnectedAsync()
        {
            // Identity is available here because of the [Authorize] attribute on the class.
            var username = Context.User?.Identity?.Name ?? "Unknown";
            _logger.LogInformation("Admin user {Username} connected to LogsHub. ConnectionId: {ConnectionId}", 
                username, Context.ConnectionId);
            
            // Send recent log history to newly connected client
            // This prevents the "empty console" effect when an admin first opens the page.
            var recentLogs = _logsService.GetRecentLogs(1000);
            await Clients.Caller.SendAsync("ReceiveLogHistory", recentLogs);
            
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var username = Context.User?.Identity?.Name ?? "Unknown";
            _logger.LogInformation("Admin user {Username} disconnected from LogsHub. ConnectionId: {ConnectionId}", 
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
            _logger.LogDebug("User {ConnectionId} subscribed to {LogLevel} logs", 
                Context.ConnectionId, logLevel);
        }
    }
}
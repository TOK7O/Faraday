using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using Faraday.API.Services.Interfaces;

namespace Faraday.API.Hubs
{
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

        public override async Task OnConnectedAsync()
        {
            var username = Context.User?.Identity?.Name ?? "Unknown";
            _logger.LogInformation("Admin user {Username} connected to LogsHub. ConnectionId: {ConnectionId}", 
                username, Context.ConnectionId);
            
            // Send recent log history to newly connected client
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
        public async Task SetLogLevelFilter(string logLevel)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"LogLevel_{logLevel}");
            _logger.LogDebug("User {ConnectionId} subscribed to {LogLevel} logs", 
                Context.ConnectionId, logLevel);
        }
    }
}
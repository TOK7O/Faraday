using Microsoft.AspNetCore.SignalR;

namespace Faraday.API.Hubs
{
    public class AlertsHub : Hub
    {
        private readonly ILogger<AlertsHub> _logger;

        public AlertsHub(ILogger<AlertsHub> logger)
        {
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            _logger.LogInformation($"Client connected to AlertsHub: {Context.ConnectionId}");
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            _logger.LogInformation($"Client disconnected from AlertsHub: {Context.ConnectionId}");
            await base.OnDisconnectedAsync(exception);
        }
    }
}
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Faraday.API.Hubs
{
    [Authorize] // Only authenticated users can connect
    public class AlertsHub : Hub
    {
        private readonly ILogger<AlertsHub> _logger;

        public AlertsHub(ILogger<AlertsHub> logger)
        {
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirst("id")?.Value;
            _logger.LogInformation($"User {userId} connected to AlertsHub. ConnectionId: {Context.ConnectionId}");
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.User?.FindFirst("id")?.Value;
            _logger.LogInformation($"User {userId} disconnected from AlertsHub. ConnectionId: {Context.ConnectionId}");
            await base.OnDisconnectedAsync(exception);
        }

        // Client can call this method to acknowledge alert receipt
        public async Task AcknowledgeAlert(int alertId)
        {
            _logger.LogInformation($"Alert {alertId} acknowledged by connection {Context.ConnectionId}");
            // Optional: mark alert as "seen" in database
        }
    }
}
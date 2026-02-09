using Faraday.API.Hubs;
using Faraday.API.Models;
using Faraday.API.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace Faraday.API.Services
{
    public class AlertNotificationService : IAlertNotificationService
    {
        private readonly IHubContext<AlertsHub> _hubContext;
        private readonly ILogger<AlertNotificationService> _logger;

        public AlertNotificationService(
            IHubContext<AlertsHub> hubContext,
            ILogger<AlertNotificationService> logger)
        {
            _hubContext = hubContext;
            _logger = logger;
        }

        public async Task SendNewAlertNotificationAsync(Alert alert)
        {
            try
            {
                // Create DTO for frontend (without navigation properties to avoid circular references)
                var alertDto = new
                {
                    alert.Id,
                    alert.RackId,
                    RackCode = alert.Rack?.Code,
                    alert.Message,
                    Type = alert.Type.ToString(),
                    alert.IsResolved,
                    alert.CreatedAt
                };

                // Broadcast to all connected clients
                await _hubContext.Clients.All.SendAsync("NewAlertCreated", alertDto);
                
                _logger.LogInformation($"Alert notification sent via SignalR: {alert.Type} - {alert.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send SignalR notification for alert {alert.Id}");
            }
        }
    }
}
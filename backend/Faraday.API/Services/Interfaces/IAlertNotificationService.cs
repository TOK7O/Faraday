using Faraday.API.Models;

namespace Faraday.API.Services.Interfaces
{
    public interface IAlertNotificationService
    {
        /// <summary>
        /// Sends real-time notification to all connected clients about new alert
        /// </summary>
        Task SendNewAlertNotificationAsync(Alert alert);
    }
}
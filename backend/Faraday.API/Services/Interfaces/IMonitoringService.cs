namespace Faraday.API.Services.Interfaces
{
    public interface IMonitoringService
    {
        /// <summary>
        /// Processes raw data from sensors (or simulation), updates rack status, logs history, and generates alerts if needed.
        /// </summary>
        Task ProcessRackReadingAsync(int rackId, decimal temperature, decimal measuredWeight);
        
        /// <summary>
        /// Checks expiration dates for all inventory items and generates alerts for items expiring soon or already expired
        /// </summary>
        Task CheckExpirationDatesAsync();
    }
    
}
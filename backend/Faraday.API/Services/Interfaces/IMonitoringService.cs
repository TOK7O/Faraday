namespace Faraday.API.Services.Interfaces;

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
        
    /// <summary>
    /// Checks expiration dates for items on a specific rack and resolves stale alerts.
    /// Called after inbound/outbound/move operations for immediate alert response.
    /// </summary>
    Task CheckExpirationDatesForRackAsync(int rackId);
}
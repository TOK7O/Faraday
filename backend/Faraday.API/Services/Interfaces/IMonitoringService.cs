namespace Faraday.API.Services.Interfaces
{
    public interface IMonitoringService
    {
        /// <summary>
        /// Processes raw data from sensors (or simulation), updates rack status, logs history, and generates alerts if needed.
        /// </summary>
        Task ProcessRackReadingAsync(int rackId, decimal temperature, decimal measuredWeight);
    }
}
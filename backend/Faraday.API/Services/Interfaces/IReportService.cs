using Faraday.API.DTOs;

namespace Faraday.API.Services.Interfaces
{
    public interface IReportService
    {
        /// <summary>
        /// Aggregates high-level statistics for the main dashboard, including slot occupancy,
        /// total weight load, and active alerts.
        /// </summary>
        Task<DashboardStatsDto> GetDashboardStatsAsync();

        /// <summary>
        /// Groups active inventory items by product definition to provide a consolidated view of stock
        /// levels and status (e.g., total vs. blocked quantity).
        /// </summary>
        Task<List<InventorySummaryDto>> GetInventorySummaryAsync();

        /// <summary>
        /// Retrieves a list of specific inventory items that are approaching their
        /// expiration date within the specified day threshold.
        /// </summary>
        Task<List<ExpiringItemDto>> GetExpiringItemsAsync(int daysThreshold);

        /// <summary>
        /// Analyzes the load of every rack, calculating both slot usage percentage and weight capacity
        /// utilization to identify bottlenecks or free space.
        /// </summary>
        Task<List<RackUtilizationDto>> GetRackUtilizationAsync();
        
        /// <summary>
        /// Retrieves temperature readings history with optional filtering by rack and date range.
        /// Returns most recent readings first, limited to specified count.
        /// </summary>
        Task<List<TemperatureHistoryDto>> GetTemperatureHistoryAsync(
            int? rackId = null, 
            DateTime? fromDate = null, 
            DateTime? toDate = null, 
            int limit = 100);

        /// <summary>
        /// Retrieves weight readings history with optional filtering by rack and date range.
        /// Returns most recent readings first, limited to specified count.
        /// </summary>
        Task<List<WeightHistoryDto>> GetWeightHistoryAsync(
            int? rackId = null, 
            DateTime? fromDate = null, 
            DateTime? toDate = null, 
            int limit = 100);

        /// <summary>
        /// Retrieves complete alert history (both resolved and unresolved) with optional filtering.
        /// </summary>
        Task<List<AlertHistoryDto>> GetAlertHistoryAsync(
            int? rackId = null, 
            DateTime? fromDate = null, 
            DateTime? toDate = null);

        /// <summary>
        /// Retrieves only currently active (unresolved) alerts across all racks.
        /// </summary>
        Task<List<ActiveAlertDto>> GetActiveAlertsAsync();
    }
}
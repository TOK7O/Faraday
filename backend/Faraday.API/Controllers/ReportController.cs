using Faraday.API.DTOs;
using Faraday.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Faraday.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ReportController : ControllerBase
    {
        private readonly IReportService _reportService;

        public ReportController(IReportService reportService)
        {
            _reportService = reportService;
        }

        [HttpGet("dashboard-stats")]
        public async Task<ActionResult<DashboardStatsDto>> GetDashboardStats()
        {
            var stats = await _reportService.GetDashboardStatsAsync();
            return Ok(stats);
        }

        [HttpGet("inventory-summary")]
        public async Task<ActionResult<IEnumerable<InventorySummaryDto>>> GetInventorySummary()
        {
            var summary = await _reportService.GetInventorySummaryAsync();
            return Ok(summary);
        }

        [HttpGet("expiring-items")]
        public async Task<ActionResult<IEnumerable<ExpiringItemDto>>> GetExpiringItems([FromQuery] int days = 7)
        {
            var items = await _reportService.GetExpiringItemsAsync(days);
            return Ok(items);
        }

        [HttpGet("rack-utilization")]
        public async Task<ActionResult<IEnumerable<RackUtilizationDto>>> GetRackUtilization()
        {
            var utilization = await _reportService.GetRackUtilizationAsync();
            return Ok(utilization);
        }
        
        /// <summary>
        /// Retrieves temperature sensor history with optional filters.
        /// Query params: rackId, fromDate (ISO 8601), toDate (ISO 8601), limit (default 100, max 1000)
        /// </summary>
        [HttpGet("temperature-history")]
        public async Task<ActionResult<IEnumerable<TemperatureHistoryDto>>> GetTemperatureHistory(
            [FromQuery] int? rackId = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] int limit = 100)
        {
            // Enforce maximum limit to prevent performance issues
            if (limit > 1000) limit = 1000;
            if (limit < 1) limit = 1;

            var history = await _reportService.GetTemperatureHistoryAsync(rackId, fromDate, toDate, limit);
            return Ok(history);
        }

        /// <summary>
        /// Retrieves weight sensor history with optional filters.
        /// Query params: rackId, fromDate (ISO 8601), toDate (ISO 8601), limit (default 100, max 1000)
        /// </summary>
        [HttpGet("weight-history")]
        public async Task<ActionResult<IEnumerable<WeightHistoryDto>>> GetWeightHistory(
            [FromQuery] int? rackId = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] int limit = 100)
        {
            if (limit > 1000) limit = 1000;
            if (limit < 1) limit = 1;

            var history = await _reportService.GetWeightHistoryAsync(rackId, fromDate, toDate, limit);
            return Ok(history);
        }

        /// <summary>
        /// Retrieves complete alert history (resolved and unresolved).
        /// Query params: rackId, fromDate (ISO 8601), toDate (ISO 8601)
        /// </summary>
        [HttpGet("alert-history")]
        public async Task<ActionResult<IEnumerable<AlertHistoryDto>>> GetAlertHistory(
            [FromQuery] int? rackId = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            var history = await _reportService.GetAlertHistoryAsync(rackId, fromDate, toDate);
            return Ok(history);
        }

        /// <summary>
        /// Retrieves only currently active (unresolved) alerts.
        /// </summary>
        [HttpGet("active-alerts")]
        public async Task<ActionResult<IEnumerable<ActiveAlertDto>>> GetActiveAlerts()
        {
            var alerts = await _reportService.GetActiveAlertsAsync();
            return Ok(alerts);
        }
    }
}
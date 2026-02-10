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
        private readonly ILogger<ReportController> _logger;

        public ReportController(IReportService reportService, ILogger<ReportController> logger)
        {
            _reportService = reportService;
            _logger = logger;
        }

        [HttpGet("dashboard-stats")]
        public async Task<ActionResult<DashboardStatsDto>> GetDashboardStats()
        {
            _logger.LogInformation("Dashboard statistics requested");
            var stats = await _reportService.GetDashboardStatsAsync();
            return Ok(stats);
        }

        [HttpGet("inventory-summary")]
        public async Task<ActionResult<IEnumerable<InventorySummaryDto>>> GetInventorySummary()
        {
            _logger.LogInformation("Inventory summary requested");
            var summary = await _reportService.GetInventorySummaryAsync();
            return Ok(summary);
        }
        
        /// <summary>
        /// Generates complete warehouse inventory report with full details of every item currently in stock.
        /// Includes location, status, expiration dates, temperature conditions, and hazard information.
        /// Sorted by rack code and slot position for easy physical verification.
        /// </summary>
        [HttpGet("full-inventory")]
        public async Task<ActionResult<IEnumerable<FullInventoryDto>>> GetFullInventory()
        {
            _logger.LogInformation("Full inventory report requested");
            var inventory = await _reportService.GetFullInventoryReportAsync();
            return Ok(inventory);
        }

        [HttpGet("expiring-items")]
        public async Task<ActionResult<IEnumerable<ExpiringItemDto>>> GetExpiringItems([FromQuery] int days = 7)
        {
            _logger.LogInformation("Expiring items report requested with threshold: {Days} days", days);
            var items = await _reportService.GetExpiringItemsAsync(days);
            return Ok(items);
        }

        [HttpGet("rack-utilization")]
        public async Task<ActionResult<IEnumerable<RackUtilizationDto>>> GetRackUtilization()
        {
            _logger.LogInformation("Rack utilization report requested");
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
            
            _logger.LogInformation("Temperature history requested. RackId: {RackId}, Limit: {Limit}", rackId, limit);

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
            
            _logger.LogInformation("Weight history requested. RackId: {RackId}, Limit: {Limit}", rackId, limit);

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
            _logger.LogInformation("Alert history requested. RackId: {RackId}", rackId);
            var history = await _reportService.GetAlertHistoryAsync(rackId, fromDate, toDate);
            return Ok(history);
        }

        /// <summary>
        /// Retrieves only currently active (unresolved) alerts.
        /// </summary>
        [HttpGet("active-alerts")]
        public async Task<ActionResult<IEnumerable<ActiveAlertDto>>> GetActiveAlerts()
        {
            _logger.LogInformation("Active alerts requested");
            var alerts = await _reportService.GetActiveAlertsAsync();
            return Ok(alerts);
        }
        
        /// <summary>
        /// Retrieves temperature violations for racks (where recorded temp was outside rack's allowed range).
        /// Query params: rackId, fromDate (ISO 8601), toDate (ISO 8601), limit (default 200, max 1000)
        /// </summary>
        [HttpGet("rack-temperature-violations")]
        public async Task<ActionResult<IEnumerable<RackTemperatureViolationDto>>> GetRackTemperatureViolations(
            [FromQuery] int? rackId = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] int limit = 200)
        {
            if (limit > 1000) limit = 1000;
            if (limit < 1) limit = 1;
            _logger.LogInformation("Rack temperature violations requested. RackId: {RackId}, Limit: {Limit}", rackId, limit);
            var violations = await _reportService.GetRackTemperatureViolationsAsync(rackId, fromDate, toDate, limit);
            return Ok(violations);
        }

        /// <summary>
        /// Retrieves temperature violations for stored items (where recorded temp was outside product's required range).
        /// Shows which products were exposed to improper temperatures.
        /// Query params: fromDate (ISO 8601), toDate (ISO 8601)
        /// </summary>
        [HttpGet("item-temperature-violations")]
        public async Task<ActionResult<IEnumerable<ItemTemperatureViolationDto>>> GetItemTemperatureViolations(
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null)
        {
            _logger.LogInformation("Item temperature violations requested");
            var violations = await _reportService.GetItemTemperatureViolationsAsync(fromDate, toDate);
            return Ok(violations);
        }
    }
}
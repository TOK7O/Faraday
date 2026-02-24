using Faraday.API.DTOs;
using Faraday.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Faraday.API.Controllers;

/// <summary>
/// API Controller responsible for generating analytical reports and dashboard metrics.
/// Aggregates data from various sources (inventory, sensors, logs) to provide operational insights.
/// </summary>
[Route("api/[controller]")]
[ApiController]
[Authorize]
public class ReportController(IReportService reportService, ILogger<ReportController> logger)
    : ControllerBase
{
    /// <summary>
    /// Retrieves high-level operational statistics for the main dashboard.
    /// </summary>
    [HttpGet("dashboard-stats")]
    public async Task<ActionResult<DashboardStatsDto>> GetDashboardStats()
    {
        logger.LogInformation("Dashboard statistics requested");
        var stats = await reportService.GetDashboardStatsAsync();
        return Ok(stats);
    }

    /// <summary>
    /// Retrieves an aggregated summary of inventory grouped by product.
    /// </summary>
    [HttpGet("inventory-summary")]
    public async Task<ActionResult<IEnumerable<InventorySummaryDto>>> GetInventorySummary()
    {
        logger.LogInformation("Inventory summary requested");
        var summary = await reportService.GetInventorySummaryAsync();
        return Ok(summary);
    }

    /// <summary>
    /// Generates a complete warehouse inventory report with full details of every item currently in stock.
    /// </summary>
    [HttpGet("full-inventory")]
    public async Task<ActionResult<IEnumerable<FullInventoryDto>>> GetFullInventory()
    {
        logger.LogInformation("Full inventory report requested");
        var inventory = await reportService.GetFullInventoryReportAsync();
        return Ok(inventory);
    }

    /// <summary>
    /// Retrieves a list of inventory items that are approaching their expiration date.
    /// </summary>
    [HttpGet("expiring-items")]
    public async Task<ActionResult<IEnumerable<ExpiringItemDto>>> GetExpiringItems([FromQuery] int days = 7)
    {
        logger.LogInformation("Expiring items report requested with threshold: {Days} days", days);
        var items = await reportService.GetExpiringItemsAsync(days);
        return Ok(items);
    }

    /// <summary>
    /// Retrieves space and weight utilization statistics for all active racks.
    /// Helps identify capacity bottlenecks or underutilized storage areas.
    /// </summary>
    [HttpGet("rack-utilization")]
    public async Task<ActionResult<IEnumerable<RackUtilizationDto>>> GetRackUtilization()
    {
        logger.LogInformation("Rack utilization report requested");
        var utilization = await reportService.GetRackUtilizationAsync();
        return Ok(utilization);
    }

    /// <summary>
    /// Retrieves temperature sensor history with optional filters.
    /// Query params: rackId, fromDate, toDate, limit (default 100, max 1000)
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

        logger.LogInformation("Temperature history requested. RackId: {RackId}, Limit: {Limit}", rackId, limit);

        var history = await reportService.GetTemperatureHistoryAsync(rackId, fromDate, toDate, limit);
        return Ok(history);
    }

    /// <summary>
    /// Retrieves weight sensor history with optional filters.
    /// Query params: rackId, fromDate, toDate, limit (default 100, max 1000)
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

        logger.LogInformation("Weight history requested. RackId: {RackId}, Limit: {Limit}", rackId, limit);

        var history = await reportService.GetWeightHistoryAsync(rackId, fromDate, toDate, limit);
        return Ok(history);
    }

    /// <summary>
    /// Retrieves complete alert history (resolved and unresolved).
    /// </summary>
    [HttpGet("alert-history")]
    public async Task<ActionResult<IEnumerable<AlertHistoryDto>>> GetAlertHistory(
        [FromQuery] int? rackId = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        logger.LogInformation("Alert history requested. RackId: {RackId}", rackId);
        var history = await reportService.GetAlertHistoryAsync(rackId, fromDate, toDate);
        return Ok(history);
    }

    /// <summary>
    /// Retrieves only currently active (unresolved) alerts.
    /// </summary>
    [HttpGet("active-alerts")]
    public async Task<ActionResult<IEnumerable<ActiveAlertDto>>> GetActiveAlerts()
    {
        logger.LogInformation("Active alerts requested");
        var alerts = await reportService.GetActiveAlertsAsync();
        return Ok(alerts);
    }

    /// <summary>
    /// Retrieves temperature violations for racks (where recorded temp was outside the rack's allowed range).
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
        logger.LogInformation("Rack temperature violations requested. RackId: {RackId}, Limit: {Limit}", rackId, limit);
        var violations = await reportService.GetRackTemperatureViolationsAsync(rackId, fromDate, toDate, limit);
        return Ok(violations);
    }

    /// <summary>
    /// Retrieves temperature violations for stored items (where recorded temp was outside the product's required range).
    /// Shows which products were exposed to improper temperatures.
    /// </summary>
    [HttpGet("item-temperature-violations")]
    public async Task<ActionResult<IEnumerable<ItemTemperatureViolationDto>>> GetItemTemperatureViolations(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        logger.LogInformation("Item temperature violations requested");
        var violations = await reportService.GetItemTemperatureViolationsAsync(fromDate, toDate);
        return Ok(violations);
    }
}
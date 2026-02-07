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
    }
}
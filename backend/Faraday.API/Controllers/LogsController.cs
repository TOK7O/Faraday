using Faraday.API.Models;
using Faraday.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Faraday.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Administrator")]
    public class LogsController : ControllerBase
    {
        private readonly ILogsService _logsService;
        private readonly ILogger<LogsController> _logger;

        public LogsController(ILogsService logsService, ILogger<LogsController> logger)
        {
            _logsService = logsService;
            _logger = logger;
        }

        /// <summary>
        /// Get recent logs from the in-memory buffer (max 1000).
        /// </summary>
        [HttpGet("recent")]
        public ActionResult<List<LogEntry>> GetRecentLogs([FromQuery] int count = 500)
        {
            if (count < 1 || count > 1000)
            {
                return BadRequest("Count must be between 1 and 1000");
            }

            _logger.LogInformation("Admin requested {Count} recent logs", count);
            var logs = _logsService.GetRecentLogs(count);
            return Ok(logs);
        }

        /// <summary>
        /// Clear the in-memory log buffer (admin only).
        /// </summary>
        [HttpDelete("clear")]
        public IActionResult ClearLogs()
        {
            _logger.LogWarning("Admin cleared log buffer");
            _logsService.ClearBuffer();
            return Ok(new { Message = "Log buffer cleared successfully" });
        }
    }
}
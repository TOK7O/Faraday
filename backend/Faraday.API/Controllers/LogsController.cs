using Faraday.API.Models;
using Faraday.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Faraday.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Administrator")]
public class LogsController(ILogsService logsService, ILogger<LogsController> logger) : ControllerBase
{
    /// <summary>
    /// Get recent logs from the in-memory buffer (max 1000).
    /// </summary>
    [HttpGet("recent")]
    public ActionResult<List<LogEntry>> GetRecentLogs([FromQuery] int count = 500)
    {
        switch (count)
        {
            case < 1:
            case > 1000:
                return BadRequest("Count must be between 1 and 1000");
        }

        logger.LogInformation("Admin requested {Count} recent logs", count);
        var logs = logsService.GetRecentLogs(count);
        return Ok(logs);
    }

    /// <summary>
    /// Clear the in-memory log buffer (admin only).
    /// </summary>
    [HttpDelete("clear")]
    public IActionResult ClearLogs()
    {
        logger.LogWarning("Admin cleared log buffer");
        logsService.ClearBuffer();
        return Ok(new { Message = "Log buffer cleared successfully" });
    }
}
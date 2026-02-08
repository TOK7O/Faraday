using Faraday.API.Services.Interfaces;
using Faraday.API.DTOs;
using Faraday.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Faraday.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize(Roles = "Administrator")] // Only the admin can handle backups
    public class BackupController : ControllerBase
    {
        private readonly IBackupService _backupService;

        public BackupController(IBackupService backupService)
        {
            _backupService = backupService;
        }

        [HttpGet("history")]
        public ActionResult<IEnumerable<BackupHistoryDto>> GetHistory()
        {
            var history = _backupService.GetBackupHistory();
            return Ok(history);
        }

        [HttpGet("db-history")]
        public async Task<ActionResult<IEnumerable<BackupLog>>> GetDatabaseHistory()
        {
            var logs = await _backupService.GetBackupHistoryFromDbAsync();
            return Ok(logs);
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateBackup()
        {
            try
            {
                var fileName = await _backupService.CreateFullBackupAsync();
                return Ok(new { Message = "Backup created successfully", FileName = fileName });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Backup failed: {ex.Message}");
            }
        }

        [HttpGet("download/{fileName}")]
        public IActionResult DownloadBackup(string fileName)
        {
            try
            {
                var stream = _backupService.GetBackupFileStream(fileName);
                return File(stream, "application/octet-stream", fileName);
            }
            catch (FileNotFoundException)
            {
                return NotFound("File not found");
            }
        }
    }
}
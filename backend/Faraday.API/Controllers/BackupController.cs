using Faraday.API.Services.Interfaces;
using Faraday.API.DTOs;
using Faraday.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Faraday.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Administrator")] // Only the admin can handle backups
    public class BackupController : ControllerBase
    {
        private readonly IBackupService _backupService;
        private readonly ILogger<BackupController> _logger;

        public BackupController(
            IBackupService backupService, 
            ILogger<BackupController> logger)
        {
            _backupService = backupService;
            _logger = logger;
        }

        [HttpGet("history")]
        public ActionResult<IEnumerable<BackupHistoryDto>> GetHistory()
        {
            _logger.LogInformation("Retrieving backup history");
            var history = _backupService.GetBackupHistory();
            return Ok(history);
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateBackup()
        {
            try
            {
                _logger.LogInformation("Manual backup creation initiated");
                var fileName = await _backupService.CreateFullBackupAsync();
                _logger.LogInformation("Manual backup created successfully: {FileName}", fileName);
                return Ok(new { Message = "Backup created successfully", FileName = fileName });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Manual backup creation failed");
                return StatusCode(500, $"Backup failed: {ex.Message}");
            }
        }

        [HttpGet("download/{fileName}")]
        public IActionResult DownloadBackup(string fileName)
        {
            try
            {
                _logger.LogInformation("Backup download requested: {FileName}", fileName);
                var stream = _backupService.GetBackupFileStream(fileName);
                return File(stream, "application/octet-stream", fileName);
            }
            catch (FileNotFoundException)
            {
                _logger.LogWarning("Backup file not found: {FileName}", fileName);
                return NotFound("File not found");
            }
        }
        
        /// <summary>
        /// Restores the database from a selected backup file.
        /// WARNING: This will overwrite current database state.
        /// Only the admin can perform this operation.
        /// </summary>
        [HttpPost("restore/{fileName}")]
        public async Task<IActionResult> RestoreBackup(string fileName)
        {
            try
            {
                
                // Get admin user ID from JWT token for audit logging
                var userIdClaim = User.FindFirst("id");
                int? userId = userIdClaim != null && int.TryParse(userIdClaim.Value, out int id) ? id : null;
                
                _logger.LogWarning("Database restore initiated from backup: {FileName} by user {UserId}", fileName, userId);
                
                await _backupService.RestoreFromBackupAsync(fileName, userId);
                
                return Ok(new 
                { 
                    Message = "Database restored successfully", 
                    FileName = fileName,
                    RestoredAt = DateTime.UtcNow
                });
            }
            catch (FileNotFoundException ex)
            {
                _logger.LogError(ex, "Restore failed - backup file not found: {FileName}", fileName);
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Database restore failed for backup: {FileName}", fileName);
                return StatusCode(500, $"Restore failed: {ex.Message}");
            }
        }
    }
}
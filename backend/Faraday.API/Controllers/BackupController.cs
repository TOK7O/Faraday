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
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Restore failed: {ex.Message}");
            }
        }
    }
}
using Faraday.API.Services.Interfaces;
using Faraday.API.DTOs;
using Faraday.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Faraday.API.Controllers
{
    /// <summary>
    /// Controller responsible for managing database backups.
    /// Operations include listing history, creating new snapshots, downloading files, 
    /// and restoring the database from a previous state.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Administrator")] 
    // Only the admin can handle backups due to the sensitivity and destructive nature of these operations.
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

        /// <summary>
        /// Retrieves the history of all backup operations stored on the server.
        /// </summary>
        /// <returns>A list of backup files with metadata (filename, size, creation date).</returns>
        [HttpGet("history")]
        public ActionResult<IEnumerable<BackupHistoryDto>> GetHistory()
        {
            _logger.LogInformation("Retrieving backup history");
            var history = _backupService.GetBackupHistory();
            return Ok(history);
        }

        /// <summary>
        /// Triggers a manual database backup.
        /// The backup file is encrypted and stored locally on the server.
        /// </summary>
        /// <returns>Confirmation message with the filename of the created backup.</returns>
        [HttpPost("create")]
        public async Task<IActionResult> CreateBackup()
        {
            try
            {
                _logger.LogInformation("Manual backup creation initiated");
                
                // Generates the backup using pg_dump and returns the filename
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

        /// <summary>
        /// Downloads a specific backup file.
        /// </summary>
        [HttpGet("download/{fileName}")]
        public IActionResult DownloadBackup(string fileName)
        {
            try
            {
                _logger.LogInformation("Backup download requested: {FileName}", fileName);
                
                // Get stream directly from the file system
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
        /// WATCH OUT: This will overwrite current database state.
        /// </summary>
        [HttpPost("restore/{fileName}")]
        public async Task<IActionResult> RestoreBackup(string fileName)
        {
            try
            {
                // Get admin user ID from JWT token for audit logging
                var userIdClaim = User.FindFirst("id");
                
                // Safe parsing of user ID
                int? userId = null;
                if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int parsedId))
                {
                    userId = parsedId;
                }
                
                _logger.LogWarning("Database restore initiated from backup: {FileName} by user {UserId}", fileName, userId);
                
                // Execute the restore process (decrypt -> pg_restore)
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
using Faraday.API.DTOs;
using Faraday.API.Models;

namespace Faraday.API.Services.Interfaces
{
    public interface IBackupService
    {
        /// <summary>
        /// Generates a full database backup, encrypts it, and saves it locally.
        /// Also returns the path to the created file.
        /// </summary>
        Task<string> CreateFullBackupAsync();

        /// <summary>
        /// Returns a file stream for a specific backup file
        /// if an admin wants to download one.
        /// </summary>
        FileStream GetBackupFileStream(string fileName);

        /// <summary>
        /// Lists all available backup files.
        /// </summary>
        IEnumerable<BackupHistoryDto> GetBackupHistory();
        
        /// <summary>
        /// Restores database from an encrypted backup file.
        /// Decrypts and applies the backup using pg_restore.
        /// </summary>
        Task RestoreFromBackupAsync(string fileName, int? restoredByUserId = null);
    }
}
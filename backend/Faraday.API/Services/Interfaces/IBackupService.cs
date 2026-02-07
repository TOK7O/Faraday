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
    }
}
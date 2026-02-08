using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Faraday.API.Data;
using Faraday.API.DTOs;
using Faraday.API.Models;
using Faraday.API.Services.Interfaces;
using Npgsql;

namespace Faraday.API.Services
{
    public class BackupService : IBackupService
    {
        private readonly FaradayDbContext _dbContext;
        private readonly IConfiguration _configuration;
        private readonly ILogger<BackupService> _logger;
        // Backup storage location inside the container
        private readonly string _backupFolder = Path.Combine(Directory.GetCurrentDirectory(), "Backups");
        
        // Encryption keys loaded from environment variables (.env file)
        // AES-256 requires 32-byte key and 16-byte IV
        private readonly byte[] _encryptionKey;
        private readonly byte[] _iv;

        public BackupService(FaradayDbContext dbContext, IConfiguration configuration, ILogger<BackupService> logger)
        {
            _dbContext = dbContext;
            _configuration = configuration;
            _logger = logger;

            // Load encryption keys from configuration (.env)
            var keyString = _configuration["BACKUP_ENCRYPTION_KEY"] 
                            ?? throw new InvalidOperationException("BACKUP_ENCRYPTION_KEY is missing in configuration.");
            var ivString = _configuration["BACKUP_ENCRYPTION_IV"] 
                           ?? throw new InvalidOperationException("BACKUP_ENCRYPTION_IV is missing in configuration.");

            // Validate key lengths for AES-256
            if (keyString.Length != 32)
                throw new InvalidOperationException("BACKUP_ENCRYPTION_KEY must be exactly 32 characters (256 bits).");
            
            if (ivString.Length != 16)
                throw new InvalidOperationException("BACKUP_ENCRYPTION_IV must be exactly 16 characters (128 bits).");

            _encryptionKey = Encoding.UTF8.GetBytes(keyString);
            _iv = Encoding.UTF8.GetBytes(ivString);

            if (!Directory.Exists(_backupFolder))
            {
                Directory.CreateDirectory(_backupFolder);
            }

            _logger.LogInformation("Backup encryption keys loaded successfully from environment.");
        }

        public async Task<string> CreateFullBackupAsync()
        {
            var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
            var fileName = $"backup_{timestamp}.enc"; // .enc - encrypted file extension
            var filePath = Path.Combine(_backupFolder, fileName);

            _logger.LogInformation($"Starting database backup: {fileName}");

            // Get connection details from Config
            var connectionString = _configuration.GetConnectionString("DefaultConnection");
            // Parse connection string to get user, pass, host, db (Basic implementation)
            var connParams = ParseConnectionString(connectionString!);

            // Setup pg_dump process
            var processInfo = new ProcessStartInfo
            {
                FileName = "pg_dump",
                // Arguments: -Fc (Custom format, compressed), -h (host), -U (user), -d (db)
                Arguments = $"-h {connParams.Host} -U {connParams.User} -d {connParams.Db} -F c",
                RedirectStandardOutput = true,
                RedirectStandardError = true, // Capture errors if pg_dump fails
                UseShellExecute = false,
                CreateNoWindow = true
            };

            // Pass password as Environment Variable (secure way for pg_dump)
            processInfo.EnvironmentVariables["PGPASSWORD"] = connParams.Password;

            using var process = new Process();
            process.StartInfo = processInfo;
            
            // Setup Encryption Streams
            using var fileStream = new FileStream(filePath, FileMode.Create);
            using var aes = Aes.Create();
            aes.Key = _encryptionKey;
            aes.IV = _iv;
            
            using var cryptoStream = new CryptoStream(fileStream, aes.CreateEncryptor(), CryptoStreamMode.Write);
            
            process.Start();

            // Copy pg_dump Output -> Encryptor -> File
            await process.StandardOutput.BaseStream.CopyToAsync(cryptoStream);
            
            var errors = await process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                _logger.LogError($"pg_dump failed: {errors}");
                // Cleanup partial file
                File.Delete(filePath); 
                throw new Exception($"Backup failed. Exit code: {process.ExitCode}. Details: {errors}");
            }

            _logger.LogInformation($"Backup completed successfully. Saved to: {filePath}");

            // 6. Log to Database
            var fileInfo = new FileInfo(filePath);
            var log = new BackupLog
            {
                FileName = fileName,
                SizeBytes = fileInfo.Length,
                IsSuccessful = true,
                Timestamp = DateTime.UtcNow
            };

            _dbContext.BackupLogs.Add(log);
            await _dbContext.SaveChangesAsync();

            return fileName;
        }

        public FileStream GetBackupFileStream(string fileName)
        {
            var path = Path.Combine(_backupFolder, fileName);
            if (!File.Exists(path))
            {
                throw new FileNotFoundException("Backup file not found.");
            }
            return new FileStream(path, FileMode.Open, FileAccess.Read);
        }

        public IEnumerable<BackupHistoryDto> GetBackupHistory()
        {
            try
            {
                // 1. Try fetching from Database
                var logs = _dbContext.BackupLogs
                    .Where(l => l.IsSuccessful)
                    .OrderByDescending(l => l.Timestamp)
                    .Select(l => new BackupHistoryDto
                    {
                        FileName = l.FileName,
                        SizeBytes = l.SizeBytes,
                        CreatedAt = l.Timestamp
                    })
                    .ToList();

                if (logs.Any())
                {
                    return logs;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Failed to fetch backup history from database: {ex.Message}. Falling back to filesystem.");
            }

            // 2. Fallback to Filesystem if database is empty or failed
            if (!Directory.Exists(_backupFolder))
            {
                return Enumerable.Empty<BackupHistoryDto>();
            }

            var directoryInfo = new DirectoryInfo(_backupFolder);
            return directoryInfo.GetFiles("*.enc")
                .Select(f => new BackupHistoryDto
                {
                    FileName = f.Name,
                    SizeBytes = f.Length,
                    CreatedAt = f.CreationTimeUtc
                })
                .OrderByDescending(f => f.CreatedAt);
        }

        public async Task<IEnumerable<BackupLog>> GetBackupHistoryFromDbAsync()
        {
            return await _dbContext.BackupLogs
                .OrderByDescending(l => l.Timestamp)
                .ToListAsync();
        }
        
        public async Task RestoreFromBackupAsync(string fileName, int? restoredByUserId = null)
        {
            var encryptedFilePath = Path.Combine(_backupFolder, fileName);

            if (!File.Exists(encryptedFilePath))
            {
                throw new FileNotFoundException($"Backup file '{fileName}' not found.");
            }

            _logger.LogWarning($"Starting database restore from: {fileName}. Terminating other connections...");
            
            // Clear the application's own connection pool
            NpgsqlConnection.ClearAllPools();

            // Parse connection details
            var connString = _configuration.GetConnectionString("DefaultConnection");
            var connParams = ParseConnectionString(connString!);

            // Connect to the maintenance database 'postgres' to kill sessions on 'faraday_db'
            // (We cannot kill connections to the database we are currently connected to)
            var masterConnString = $"Host={connParams.Host};Username={connParams.User};Password={connParams.Password};Database=postgres";

            try 
            {
                using (var conn = new NpgsqlConnection(masterConnString))
                {
                    await conn.OpenAsync();
                    using (var cmd = conn.CreateCommand())
                    {
                        // SQL: Terminate all backend processes connected to our target DB, except our own process
                        cmd.CommandText = $@"
                            SELECT pg_terminate_backend(pg_stat_activity.pid)
                            FROM pg_stat_activity
                            WHERE pg_stat_activity.datname = '{connParams.Db}'
                              AND pid <> pg_backend_pid();";
                        
                        await cmd.ExecuteNonQueryAsync();
                    }
                }
                _logger.LogInformation("Successfully terminated all other database connections.");
            }
            catch (Exception ex)
            {
                _logger.LogWarning($"Could not terminate other connections (restore might hang if DB is locked): {ex.Message}");
            }

            // Decrypt and Restore

            // Create a temporary path for the decrypted dump file
            var tempDecryptedPath = Path.Combine(_backupFolder, $"temp_decrypt_{Guid.NewGuid()}.dump");

            try
            {
                // Decrypt the backup file
                using (var encryptedStream = new FileStream(encryptedFilePath, FileMode.Open, FileAccess.Read))
                using (var decryptedStream = new FileStream(tempDecryptedPath, FileMode.Create, FileAccess.Write))
                {
                    using var aes = Aes.Create();
                    aes.Key = _encryptionKey;
                    aes.IV = _iv;

                    using var cryptoStream = new CryptoStream(encryptedStream, aes.CreateDecryptor(), CryptoStreamMode.Read);
                    await cryptoStream.CopyToAsync(decryptedStream);
                }

                _logger.LogInformation("Backup decrypted successfully to temporary file.");

                // Execute pg_restore
                var processInfo = new ProcessStartInfo
                {
                    FileName = "pg_restore",
                    // Arguments explanation:
                    // -h, -U, -d: Connection details
                    // --clean: Drop database objects before creating them (ensures clean state)
                    // --if-exists: Prevents errors if we try to drop non-existent tables
                    // --no-owner --role={user}: Prevents permission errors related to object ownership
                    Arguments = $"-h {connParams.Host} -U {connParams.User} -d {connParams.Db} --clean --if-exists --no-owner --role={connParams.User} {tempDecryptedPath}",
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                // Pass password securely via environment variable
                processInfo.EnvironmentVariables["PGPASSWORD"] = connParams.Password;

                using var process = new Process();
                process.StartInfo = processInfo;
                process.Start();

                // Capture output logs
                var errors = await process.StandardError.ReadToEndAsync();
                await process.WaitForExitAsync();

                // C. Handle Result
                if (process.ExitCode != 0)
                {
                    _logger.LogError($"pg_restore failed: {errors}");
                    
                    var failedLog = new BackupLog
                    {
                        FileName = fileName,
                        SizeBytes = new FileInfo(encryptedFilePath).Length,
                        IsSuccessful = false,
                        ErrorMessage = $"Restore failed: {errors}",
                        Timestamp = DateTime.UtcNow,
                        CreatedByUserId = restoredByUserId
                    };
                    
                    _dbContext.BackupLogs.Add(failedLog);
                    await _dbContext.SaveChangesAsync();

                    throw new Exception($"Database restore failed. Exit code: {process.ExitCode}. Details: {errors}");
                }

                _logger.LogInformation($"Database restored successfully from: {fileName}");

                var successLog = new BackupLog
                {
                    FileName = $"RESTORE: {fileName}",
                    SizeBytes = new FileInfo(encryptedFilePath).Length,
                    IsSuccessful = true,
                    Timestamp = DateTime.UtcNow,
                    CreatedByUserId = restoredByUserId
                };

                _dbContext.BackupLogs.Add(successLog);
                await _dbContext.SaveChangesAsync();
            }
            finally
            {
                // Cleanup Security Risk
                if (File.Exists(tempDecryptedPath))
                {
                    File.Delete(tempDecryptedPath);
                    _logger.LogInformation("Temporary decrypted file removed.");
                }
            }
        }
        
        // Helper to extract credentials from connection string
        private (string Host, string User, string Password, string Db) ParseConnectionString(string connString)
        {
            var dict = connString.Split(';')
                .Where(part => !string.IsNullOrWhiteSpace(part) && part.Contains('='))
                .Select(part => part.Split('=', 2))
                .ToDictionary(part => part[0].Trim().ToLower(), part => part[1].Trim());
            
            string GetValue(string[] keys, string defaultValue)
            {
                foreach (var key in keys)
                {
                    if (dict.TryGetValue(key, out var value)) return value;
                }
                return defaultValue;
            }

            return (
                Host: GetValue(new[] { "host", "server", "data source" }, "db"),
                User: GetValue(new[] { "username", "user id", "uid", "user" }, "postgres"),
                Password: GetValue(new[] { "password", "pwd" }, "postgres"),
                Db: GetValue(new[] { "database", "initial catalog" }, "faraday_db")
            );
        }
    }
}
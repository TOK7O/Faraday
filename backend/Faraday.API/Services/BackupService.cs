using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Faraday.API.Data;
using Faraday.API.DTOs;
using Faraday.API.Models;
using Faraday.API.Services.Interfaces;

namespace Faraday.API.Services
{
    public class BackupService : IBackupService
    {
        private readonly FaradayDbContext _dbContext;
        private readonly IConfiguration _configuration;
        private readonly ILogger<BackupService> _logger;
        // Backup storage location inside the container
        private readonly string _backupFolder = Path.Combine(Directory.GetCurrentDirectory(), "Backups");
        
        //TODO: do smth about this later
        
        // Encryption Key (In production, this should be in Azure KeyVault/AWS Secrets)
        // Using a hardcoded key here ONLY because it's a contest, so we won't have to set up an entire cloud system for this.
        private readonly byte[] _encryptionKey = Encoding.UTF8.GetBytes("FaradayWMS_Secure_Backup_Key_256"); 
        private readonly byte[] _iv = Encoding.UTF8.GetBytes("Faraday_Init_Vec");

        public BackupService(FaradayDbContext dbContext, IConfiguration configuration, ILogger<BackupService> logger)
        {
            _dbContext = dbContext;
            _configuration = configuration;
            _logger = logger;

            if (!Directory.Exists(_backupFolder))
            {
                Directory.CreateDirectory(_backupFolder);
            }
        }

        public async Task<string> CreateFullBackupAsync()
        {
            var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
            var fileName = $"backup_{timestamp}.enc"; // .enc - encrypted file extension
            var filePath = Path.Combine(_backupFolder, fileName);

            _logger.LogInformation($"Starting database backup: {fileName}");

            // 1. Get connection details from Config
            var connectionString = _configuration.GetConnectionString("DefaultConnection");
            // Parse connection string to get user, pass, host, db (Basic implementation)
            var connParams = ParseConnectionString(connectionString!);

            // 2. Setup pg_dump process
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
            
            // 3. Setup Encryption Streams
            using var fileStream = new FileStream(filePath, FileMode.Create);
            using var aes = Aes.Create();
            aes.Key = _encryptionKey;
            aes.IV = _iv;
            
            using var cryptoStream = new CryptoStream(fileStream, aes.CreateEncryptor(), CryptoStreamMode.Write);

            // 4. Start Process
            process.Start();

            // 5. Copy pg_dump Output -> Encryptor -> File
            // This streams data directly, efficient for large databases
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
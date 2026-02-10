using Faraday.API.Services.Interfaces;

namespace Faraday.API.Workers
{
    public class BackupBackgroundWorker : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<BackupBackgroundWorker> _logger;
        // Schedule
        private readonly TimeSpan _period = TimeSpan.FromHours(24);

        public BackupBackgroundWorker(IServiceProvider serviceProvider, ILogger<BackupBackgroundWorker> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Backup Background Worker started.");

            // Create a timer that ticks periodically
            using var timer = new PeriodicTimer(_period);

            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    _logger.LogInformation("Executing scheduled backup...");
                    
                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var backupService = scope.ServiceProvider.GetRequiredService<IBackupService>();
                        var fileName = await backupService.CreateFullBackupAsync();
                        
                        _logger.LogInformation($"Scheduled backup finished: {fileName}");
                        
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Scheduled backup failed.");
                }
            }
        }
    }
}
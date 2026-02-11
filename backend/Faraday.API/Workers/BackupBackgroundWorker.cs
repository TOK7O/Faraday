using Faraday.API.Services.Interfaces;

namespace Faraday.API.Workers
{
    public class BackupBackgroundWorker(IServiceProvider serviceProvider, ILogger<BackupBackgroundWorker> logger)
        : BackgroundService
    {
        // Schedule
        private readonly TimeSpan _period = TimeSpan.FromHours(24);

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            logger.LogInformation("Backup Background Worker started.");

            // Create a timer that ticks periodically
            using var timer = new PeriodicTimer(_period);

            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                try
                {
                    logger.LogInformation("Executing scheduled backup...");
                    
                    using (var scope = serviceProvider.CreateScope())
                    {
                        var backupService = scope.ServiceProvider.GetRequiredService<IBackupService>();
                        var fileName = await backupService.CreateFullBackupAsync();
                        
                        logger.LogInformation($"Scheduled backup finished: {fileName}");
                        
                    }
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Scheduled backup failed.");
                }
            }
        }
    }
}
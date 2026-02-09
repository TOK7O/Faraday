using Faraday.API.Services.Interfaces;

namespace Faraday.API.Workers
{
    public class ExpirationMonitoringWorker : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<ExpirationMonitoringWorker> _logger;
        
        // Run expiration check every 1 hour
        private readonly TimeSpan _period = TimeSpan.FromHours(1);

        public ExpirationMonitoringWorker(
            IServiceProvider serviceProvider, 
            ILogger<ExpirationMonitoringWorker> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Expiration Monitoring Worker started.");

            // Run check immediately on startup to catch any issues right away
            await RunExpirationCheckAsync();

            using var timer = new PeriodicTimer(_period);

            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                await RunExpirationCheckAsync();
            }
        }

        private async Task RunExpirationCheckAsync()
        {
            try
            {
                _logger.LogInformation("Running scheduled expiration date check...");
                
                using var scope = _serviceProvider.CreateScope();
                var monitoringService = scope.ServiceProvider.GetRequiredService<IMonitoringService>();
                
                await monitoringService.CheckExpirationDatesAsync();
                
                _logger.LogInformation("Expiration check completed successfully.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during expiration date check.");
            }
        }
    }
}
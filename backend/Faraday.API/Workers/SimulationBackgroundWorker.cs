using Faraday.API.Data;
using Faraday.API.Models;
using Faraday.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Faraday.API.Workers
{
    public class SimulationBackgroundWorker(
        IServiceProvider serviceProvider,
        ILogger<SimulationBackgroundWorker> logger,
        IConfiguration configuration)
        : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider = serviceProvider;
        private readonly ILogger<SimulationBackgroundWorker> _logger = logger;
        private readonly Random _random = new Random();

        private readonly int _cycleDelaySeconds = configuration.GetValue("Simulation:CycleDelaySeconds", 30);
        private readonly int _expectedFaultsPerHour = configuration.GetValue("Simulation:ExpectedFaultsPerHour", 1);

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Simulation Background Worker started. Initializing sensors...");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await RunSimulationCycle();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in Simulation Worker cycle.");
                }

                await Task.Delay(TimeSpan.FromSeconds(_cycleDelaySeconds), stoppingToken);
            }
        }

        private async Task RunSimulationCycle()
        {
            using var scope = _serviceProvider.CreateScope();
            
            var monitoringService = scope.ServiceProvider.GetRequiredService<IMonitoringService>();
            var context = scope.ServiceProvider.GetRequiredService<FaradayDbContext>();

            // Fetch active racks
            var racks = await context.Racks
                .Include(r => r.Slots)
                .ThenInclude(s => s.CurrentItem)
                .ThenInclude(i => i!.Product)
                .Where(r => r.IsActive)
                .ToListAsync();

            if (!racks.Any()) return;
            
            // 1 hour = 3600 seconds.
            // Cycles per hour = 3600 / CycleDelaySeconds (e.g., 3600 / 10 = 360 cycles).
            int cyclesPerHour = 3600 / _cycleDelaySeconds;
            
            // Use ExpectedFaultsPerHour to determine the probability range.
            // If ExpectedFaultsPerHour is 1, we check if Random(0..360) < 1 (only 0 is true).
            // If ExpectedFaultsPerHour is 5, we check if Random(0..360) < 5 (0,1,2,3,4 are true).
            bool triggerAnomaly = _random.Next(0, cyclesPerHour) < _expectedFaultsPerHour;

            // If anomaly triggers, picks one random victim rack
            Rack? victimRack = null;
            if (triggerAnomaly)
            {
                victimRack = racks[_random.Next(racks.Count)];
            }

            foreach (var rack in racks)
            {
                // Calculate what the sensor should see
                decimal idealWeight = rack.Slots
                    .Where(s => s.CurrentItem != null)
                    .Sum(s => s.CurrentItem!.Product.WeightKg);
                
                decimal safeTemp = (rack.MinTemperature + rack.MaxTemperature) / 2;
                
                decimal simulatedTemp;
                decimal simulatedWeight;

                // Apply Simulation Logic
                if (rack == victimRack)
                {
                    
                    // Randomly choose a failure type (0 = Temperature Failure, 1 = Theft)
                    int failureType = _random.Next(0, 2);

                    if (failureType == 0) 
                    {
                        // Simulate Temperature Failure
                        simulatedTemp = rack.MaxTemperature + (decimal)(_random.NextDouble() * 10.0 + 2.0);
                        simulatedWeight = idealWeight;
                        _logger.LogInformation($"[SIMULATION] Generating TEMP SPIKE for Rack {rack.Code}");
                    }
                    else 
                    {
                        // Simulate Theft (Weight drop)
                        simulatedTemp = safeTemp;
                        decimal stolenAmount = (decimal)(_random.NextDouble() * 8.0 + 2.0);
                        simulatedWeight = Math.Max(0, idealWeight - stolenAmount);
                        _logger.LogInformation($"[SIMULATION] Generating WEIGHT DROP for Rack {rack.Code}");
                    }
                }
                else
                {
                    
                    // Add slight noise to temperature
                    decimal tempRange = rack.MaxTemperature - rack.MinTemperature;
                    decimal noise = (decimal)(_random.NextDouble() - 0.5) * (tempRange * 0.2m); 
                    simulatedTemp = safeTemp + noise;

                    // Add slight noise to weight
                    decimal weightNoise = (decimal)(_random.NextDouble() * 0.04 - 0.02);
                    simulatedWeight = Math.Max(0, idealWeight + weightNoise);
                }

                // Send data to Monitoring Service
                await monitoringService.ProcessRackReadingAsync(rack.Id, simulatedTemp, simulatedWeight);
            }
        }
    }
}
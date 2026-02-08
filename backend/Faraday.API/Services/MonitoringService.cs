using Faraday.API.Data;
using Faraday.API.Models;
using Microsoft.EntityFrameworkCore;
using Faraday.API.Services.Interfaces;

namespace Faraday.API.Services
{
    public class MonitoringService : IMonitoringService
    {
        private readonly FaradayDbContext _context;
        private readonly ILogger<MonitoringService> _logger;

        public MonitoringService(FaradayDbContext context, ILogger<MonitoringService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task ProcessRackReadingAsync(int rackId, decimal temperature, decimal measuredWeight)
        {
            // Fetch current rack state including slots and products to calculate expected values
            var rack = await _context.Racks
                .Include(r => r.Slots)
                .ThenInclude(s => s.CurrentItem)
                .ThenInclude(i => i!.Product)
                .FirstOrDefaultAsync(r => r.Id == rackId);

            if (rack == null || !rack.IsActive) return;

            // Update the "Live State" of the rack
            rack.CurrentTemperature = temperature;
            rack.CurrentTotalWeightKg = measuredWeight;
            rack.LastTemperatureCheck = DateTime.UtcNow;
            rack.LastWeightCheck = DateTime.UtcNow;

            // Calculate expected weight based on items currently stored in the database
            decimal expectedWeight = rack.Slots
                .Where(s => s.CurrentItem != null)
                .Sum(s => s.CurrentItem!.Product.WeightKg);
            
            rack.ExpectedTotalWeightKg = expectedWeight;

            // Log historical data into tables for reporting purposes
            _context.TemperatureReadings.Add(new TemperatureReading
            {
                RackId = rackId,
                RecordedTemperature = temperature,
                Timestamp = DateTime.UtcNow
            });

            _context.WeightReadings.Add(new WeightReading
            {
                RackId = rackId,
                MeasuredWeightKg = measuredWeight,
                ExpectedWeightKg = expectedWeight,
                Timestamp = DateTime.UtcNow
            });

            // Check for Anomalies and create Alerts

            // Temperature Analysis
            if (temperature > rack.MaxTemperature || temperature < rack.MinTemperature)
            {
                await CreateAlertIfNotExists(rackId, AlertType.TemperatureMismatch, 
                    $"CRITICAL: Temperature {temperature:F1}°C is out of bounds ({rack.MinTemperature}-{rack.MaxTemperature}°C)!");
            }
            else
            {
                // Auto-resolve alert if temperature returns to normal range
                await ResolveAlertIfExists(rackId, AlertType.TemperatureMismatch);
            }

            // Weight Analysis (Theft Detection)
            // We allow a tolerance of 0.5kg for sensor noise
            if (expectedWeight > 0 && measuredWeight < (expectedWeight - 0.5m))
            {
                await CreateAlertIfNotExists(rackId, AlertType.WeightMismatch,
                    $"SECURITY: Missing weight detected! Expected {expectedWeight:F2}kg, Sensor reads {measuredWeight:F2}kg.");
            }
            else
            {
                await ResolveAlertIfExists(rackId, AlertType.WeightMismatch);
            }

            await _context.SaveChangesAsync();
        }

        // Helper method to prevent spamming the database with duplicate active alerts
        private async Task CreateAlertIfNotExists(int rackId, AlertType type, string message)
        {
            bool activeAlertExists = await _context.Alerts
                .AnyAsync(a => a.RackId == rackId && a.Type == type && !a.IsResolved);

            if (!activeAlertExists)
            {
                _context.Alerts.Add(new Alert
                {
                    RackId = rackId,
                    Type = type,
                    Message = message,
                    CreatedAt = DateTime.UtcNow,
                    IsResolved = false
                });
                _logger.LogWarning($"Alert created for Rack {rackId}: {message}");
            }
        }

        // Helper method to auto-resolve alerts when conditions improve
        private async Task ResolveAlertIfExists(int rackId, AlertType type)
        {
            var activeAlert = await _context.Alerts
                .FirstOrDefaultAsync(a => a.RackId == rackId && a.Type == type && !a.IsResolved);

            if (activeAlert != null)
            {
                activeAlert.IsResolved = true;
                activeAlert.ResolvedAt = DateTime.UtcNow;
                activeAlert.Message += " [RESOLVED: Sensor readings returned to normal]";
                _logger.LogInformation($"Alert resolved for Rack {rackId}: {type}");
            }
        }
    }
}
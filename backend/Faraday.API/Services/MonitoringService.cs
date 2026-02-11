using Faraday.API.Data;
using Faraday.API.Models;
using Microsoft.EntityFrameworkCore;
using Faraday.API.Services.Interfaces;

namespace Faraday.API.Services
{
    /// <summary>
    /// Service responsible for processing real-time sensor data (IoT) and monitoring inventory health.
    /// Handles temperature and weight validation, anomaly detection, and automated alert generation.
    /// </summary>
    public class MonitoringService(
        FaradayDbContext context,
        ILogger<MonitoringService> logger,
        IAlertNotificationService notificationService,
        IConfiguration configuration)
        : IMonitoringService
    {
        /// <summary>
        /// Ingests real-time telemetry from a physical rack sensor.
        /// Updates Rack entity and triggers alerts if values deviate from expected baselines.
        /// </summary>
        /// <param name="rackId">Database ID of the rack.</param>
        /// <param name="temperature">Current temperature reading in Celsius.</param>
        /// <param name="measuredWeight">Total weight currently measured by the scale sensors in kg.</param>
        public async Task ProcessRackReadingAsync(int rackId, decimal temperature, decimal measuredWeight)
        {
            // Fetch current rack state including slots and products to calculate expected values
            var rack = await context.Racks
                .Include(r => r.Slots)
                .ThenInclude(s => s.CurrentItem)
                .ThenInclude(i => i!.Product)
                .FirstOrDefaultAsync(r => r.Id == rackId);
            
            logger.LogDebug("Processing rack reading for Rack {RackCode}: Temp={Temperature}°C, Weight={Weight}kg", 
                rack?.Code, temperature, measuredWeight);
            
            // If the rack is inactive or not found, we ignore the telemetry to prevent ghost data.
            if (rack == null || !rack.IsActive) return;

            // Update the "Live State" of the rack
            rack.CurrentTemperature = temperature;
            rack.CurrentTotalWeightKg = measuredWeight;
            rack.LastTemperatureCheck = DateTime.UtcNow;
            rack.LastWeightCheck = DateTime.UtcNow;

            // Calculate the expected weight based on items currently stored in the database
            // Sum of (Item Count * Product Weight) for all occupied slots.
            decimal expectedWeight = rack.Slots
                .Where(s => s.CurrentItem != null)
                .Sum(s => s.CurrentItem!.Product.WeightKg);
            logger.LogTrace("Rack {RackCode} expected weight: {ExpectedWeight}kg, measured: {MeasuredWeight}kg", 
                rack.Code, expectedWeight, measuredWeight);
            
            rack.ExpectedTotalWeightKg = expectedWeight;

            // Log historical data into tables for reporting purposes
            // This enables historical trend analysis
            context.TemperatureReadings.Add(new TemperatureReading
            {
                RackId = rackId,
                RecordedTemperature = temperature,
                Timestamp = DateTime.UtcNow
            });

            context.WeightReadings.Add(new WeightReading
            {
                RackId = rackId,
                MeasuredWeightKg = measuredWeight,
                ExpectedWeightKg = expectedWeight,
                Timestamp = DateTime.UtcNow
            });

            // Check for Anomalies and create Alerts

            // Temperature Analysis
            // Triggers if the environment is too hot or too cold for the stored goods.
            if (temperature > rack.MaxTemperature || temperature < rack.MinTemperature)
            {
                await CreateAlertIfNotExists(rackId, AlertType.TemperatureMismatch, 
                    $"CRITICAL: Temperature {temperature:F1}°C is out of bounds ({rack.MinTemperature}-{rack.MaxTemperature}°C)!");
            }
            else
            {
                // Auto-resolve alert if the temperature returns to normal range
                // This prevents "stale" alerts from cluttering the dashboard.
                await ResolveAlertIfExists(rackId, AlertType.TemperatureMismatch);
            }

            // Weight Analysis (Theft/Loss Detection)
            // Triggers if the measured weight is significantly lower than expected.
            // We allow a tolerance of 0.5kg to account for sensor noise or minor calibration drift.
            if (expectedWeight > 0 && measuredWeight < (expectedWeight - 0.5m))
            {
                await CreateAlertIfNotExists(rackId, AlertType.WeightMismatch,
                    $"SECURITY: Missing weight detected! Expected {expectedWeight:F2}kg, Sensor reads {measuredWeight:F2}kg.");
            }
            else
            {
                // Auto-resolve if weight matches expectation (so the item was legally removed or sensor recalibrated).
                await ResolveAlertIfExists(rackId, AlertType.WeightMismatch);
            }

            await context.SaveChangesAsync();
        }

        // Helper method to prevent spamming the database with duplicate active alerts
        // Ensures we only have one active alert of a specific type per rack at any given time.
        private async Task CreateAlertIfNotExists(int rackId, AlertType type, string message)
        {
            bool activeAlertExists = await context.Alerts
                .AnyAsync(a => a.RackId == rackId && a.Type == type && !a.IsResolved);

            if (!activeAlertExists)
            {
                var alert = new Alert
                {
                    RackId = rackId,
                    Type = type,
                    Message = message,
                    CreatedAt = DateTime.UtcNow,
                    IsResolved = false
                };

                context.Alerts.Add(alert);
                await context.SaveChangesAsync();
        
                logger.LogWarning($"Alert created for Rack {rackId}: {message}");
        
                // Send real-time notification to frontend via the notification service.
                // This pushes the alert to connected clients immediately.
                await notificationService.SendNewAlertNotificationAsync(alert);
            }
        }
        
        // Helper method to auto-resolve alerts when conditions improve
        private async Task ResolveAlertIfExists(int rackId, AlertType type)
        {
            var activeAlert = await context.Alerts
                .FirstOrDefaultAsync(a => a.RackId == rackId && a.Type == type && !a.IsResolved);

            if (activeAlert != null)
            {
                activeAlert.IsResolved = true;
                activeAlert.ResolvedAt = DateTime.UtcNow;
                activeAlert.Message += " [RESOLVED: Sensor readings returned to normal]";
                logger.LogInformation($"Alert resolved for Rack {rackId}: {type}");
            }
        }
        
        /// <summary>
        /// Scheduled task to check for expired or soon-to-expire inventory items.
        /// Scans all in-stock items and generates alerts based on configuration thresholds.
        /// </summary>
        public async Task CheckExpirationDatesAsync()
        {
            var warningDays = configuration.GetValue("Monitoring:ExpirationWarningDays", 7);

            var now = DateTime.UtcNow;
            var warningThreshold = now.AddDays(warningDays);

            // Group items by product and rack to avoid duplicate alerts
            // We want one alert per Product-Rack combination.
            var itemsWithExpiration = await context.InventoryItems
                .Include(i => i.Product)
                .Include(i => i.Slot)
                .ThenInclude(s => s.Rack)
                .Where(i => i.ExpirationDate != null && i.Status == ItemStatus.InStock)
                .GroupBy(i => new { i.ProductDefinitionId, i.Slot.RackId })
                .Select(g => new
                {
                    ProductId = g.Key.ProductDefinitionId,
                    g.Key.RackId,
                    Items = g.OrderBy(x => x.ExpirationDate).ToList() // Earliest expiration first
                })
                .ToListAsync();

            foreach (var group in itemsWithExpiration)
            {
                var earliestItem = group.Items.First();
                var expirationDate = earliestItem.ExpirationDate!.Value;
                var rack = earliestItem.Slot.Rack;
                var product = earliestItem.Product;
                var count = group.Items.Count;

                // Check if the product is already expired
                if (expirationDate < now)
                {
                    var daysOverdue = (now - expirationDate).Days;
                    var message = $"EXPIRED: {count}x '{product.Name}' (Barcode: {product.ScanCode}) " +
                                 $"in rack {rack.Code} expired on {expirationDate:yyyy-MM-dd}. " +
                                 $"Days overdue: {daysOverdue}";

                    await CreateAlertIfNotExists(rack.Id, AlertType.ExpirationExpired, message);
                }
                // Check if the product is expiring soon (within a warning threshold)
                else if (expirationDate <= warningThreshold)
                {
                    var daysRemaining = (expirationDate - now).Days;
                    var message = $"WARNING: {count}x '{product.Name}' (Barcode: {product.ScanCode}) " +
                                 $"in rack {rack.Code} expires in {daysRemaining} days " +
                                 $"(Expiration: {expirationDate:yyyy-MM-dd}).";

                    await CreateAlertIfNotExists(rack.Id, AlertType.ExpirationWarning, message);
                }
                else
                {
                    // Product is still fresh - auto-resolve any existing expiration alerts
                    // This handles cases where expired items were removed, leaving only fresh ones.
                    await ResolveExpirationAlertsForProduct(product.Id, rack.Id);
                }
            }

            await context.SaveChangesAsync();
        }
        
        // Helper method to auto-resolve expiration alerts when an item is OK or removed
        private async Task ResolveExpirationAlertsForProduct(int productId, int rackId)
        {
            var activeAlerts = await context.Alerts
                .Where(a => a.RackId == rackId &&
                            !a.IsResolved &&
                            (a.Type == AlertType.ExpirationWarning || a.Type == AlertType.ExpirationExpired))
                .ToListAsync();

            // Get product info for matching to ensure we only resolve alerts for this specific product
            var product = await context.Products.FindAsync(productId);
            if (product == null) return;

            foreach (var alert in activeAlerts.Where(a => a.Message.Contains(product.ScanCode)))
            {
                alert.IsResolved = true;
                alert.ResolvedAt = DateTime.UtcNow;
                alert.Message += " [RESOLVED: Item status updated or removed from inventory]";
                logger.LogInformation($"Expiration alert {alert.Id} auto-resolved for product {productId} in rack {rackId}");
            }
        }
    }
}
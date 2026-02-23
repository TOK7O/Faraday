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
                    $"CRITICAL: Temperature {temperature:F1}°C is out of bounds ({rack.MinTemperature:F1}-{rack.MaxTemperature:F1}°C)!");
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

        // Helper method to prevent spamming the database with duplicate active alerts.
        // For expiration alerts: deduplicates by (rackId, type, productId) so each product gets its own alert.
        // For other alerts (temperature, weight): deduplicates by (rackId, type) as before.
        private async Task CreateAlertIfNotExists(int rackId, AlertType type, string message, int? productId = null)
        {
            bool activeAlertExists;
            
            if (productId.HasValue)
            {
                // Expiration alerts: one per product-rack-type combination
                activeAlertExists = await context.Alerts
                    .AnyAsync(a => a.RackId == rackId && a.Type == type 
                                   && a.ProductDefinitionId == productId.Value && !a.IsResolved);
            }
            else
            {
                // Temperature/Weight alerts: one per rack-type combination
                activeAlertExists = await context.Alerts
                    .AnyAsync(a => a.RackId == rackId && a.Type == type && !a.IsResolved);
            }

            if (!activeAlertExists)
            {
                var alert = new Alert
                {
                    RackId = rackId,
                    Type = type,
                    Message = message,
                    ProductDefinitionId = productId,
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
        /// Scans ALL in-stock items and generates alerts per product-rack combination.
        /// Also resolves orphaned alerts for products that are no longer in stock.
        /// </summary>
        public async Task CheckExpirationDatesAsync()
        {
            var warningDays = configuration.GetValue("Monitoring:ExpirationWarningDays", 7);

            var now = DateTime.UtcNow;
            var warningThreshold = now.AddDays(warningDays);

            // Get ALL items with expiration dates, grouped by product + rack.
            // Each product-rack combo is evaluated independently (one alert per product per rack).
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

            // Track which (productId, rackId) combos still have items in stock
            var activeProductRackPairs = new HashSet<(int productId, int rackId)>();

            foreach (var group in itemsWithExpiration)
            {
                activeProductRackPairs.Add((group.ProductId, group.RackId));
                
                var earliestItem = group.Items.First();
                var expirationDate = earliestItem.ExpirationDate!.Value;
                var rack = earliestItem.Slot.Rack;
                var product = earliestItem.Product;
                var count = group.Items.Count;

                // Check if the product is already expired
                if (expirationDate < now)
                {
                    var daysOverdue = (now.Date - expirationDate.Date).Days;
                    var message = $"EXPIRED: {count}x '{product.Name}' (Barcode: {product.ScanCode}) " +
                                 $"in rack {rack.Code} expired on {expirationDate:yyyy-MM-dd}. " +
                                 $"Days overdue: {daysOverdue}";

                    await CreateAlertIfNotExists(rack.Id, AlertType.ExpirationExpired, message, product.Id);
                    
                    // If product went from warning to expired, resolve the old warning
                    await ResolveExpirationAlertsForProduct(product.Id, rack.Id, AlertType.ExpirationWarning);
                }
                // Check if the product is expiring soon (within a warning threshold)
                else if (expirationDate <= warningThreshold)
                {
                    var daysRemaining = (expirationDate.Date - now.Date).Days;
                    var message = $"WARNING: {count}x '{product.Name}' (Barcode: {product.ScanCode}) " +
                                 $"in rack {rack.Code} expires in {daysRemaining} days " +
                                 $"(Expiration: {expirationDate:yyyy-MM-dd}).";

                    await CreateAlertIfNotExists(rack.Id, AlertType.ExpirationWarning, message, product.Id);
                }
                else
                {
                    // Product is still fresh - auto-resolve any existing expiration alerts
                    await ResolveExpirationAlertsForProduct(product.Id, rack.Id);
                }
            }

            // Orphan sweep: resolve alerts for products that are no longer in stock on their rack.
            // This handles outbound/removal cases where the product disappears from the query entirely.
            var orphanedAlerts = await context.Alerts
                .Where(a => !a.IsResolved &&
                            (a.Type == AlertType.ExpirationWarning || a.Type == AlertType.ExpirationExpired))
                .ToListAsync();

            foreach (var alert in orphanedAlerts)
            {
                if (alert.RackId.HasValue && alert.ProductDefinitionId.HasValue)
                {
                    if (!activeProductRackPairs.Contains((alert.ProductDefinitionId.Value, alert.RackId.Value)))
                    {
                        alert.IsResolved = true;
                        alert.ResolvedAt = DateTime.UtcNow;
                        alert.Message += " [RESOLVED: Product no longer in stock on this rack]";
                        logger.LogInformation($"Orphaned expiration alert {alert.Id} auto-resolved (product {alert.ProductDefinitionId} no longer on rack {alert.RackId})");
                    }
                }
                else if (!alert.ProductDefinitionId.HasValue)
                {
                    // Legacy alert without ProductDefinitionId - resolve it since we can't track it properly
                    alert.IsResolved = true;
                    alert.ResolvedAt = DateTime.UtcNow;
                    alert.Message += " [RESOLVED: Legacy alert migrated]";
                    logger.LogInformation($"Legacy expiration alert {alert.Id} auto-resolved (no ProductDefinitionId)");
                }
            }

            await context.SaveChangesAsync();
        }

        /// <summary>
        /// Targeted expiration check for a specific rack. Called after inbound/outbound/move operations
        /// for immediate alert response without waiting for the periodic worker.
        /// </summary>
        public async Task CheckExpirationDatesForRackAsync(int rackId)
        {
            var warningDays = configuration.GetValue("Monitoring:ExpirationWarningDays", 7);
            var now = DateTime.UtcNow;
            var warningThreshold = now.AddDays(warningDays);

            var itemsOnRack = await context.InventoryItems
                .Include(i => i.Product)
                .Include(i => i.Slot)
                .ThenInclude(s => s.Rack)
                .Where(i => i.Slot.RackId == rackId && i.ExpirationDate != null && i.Status == ItemStatus.InStock)
                .GroupBy(i => i.ProductDefinitionId)
                .Select(g => new
                {
                    ProductId = g.Key,
                    Items = g.OrderBy(x => x.ExpirationDate).ToList()
                })
                .ToListAsync();

            // Track active products on this rack
            var activeProductIds = new HashSet<int>();

            foreach (var group in itemsOnRack)
            {
                activeProductIds.Add(group.ProductId);
                
                var earliestItem = group.Items.First();
                var expirationDate = earliestItem.ExpirationDate!.Value;
                var product = earliestItem.Product;
                var count = group.Items.Count;

                if (expirationDate < now)
                {
                    var rack = earliestItem.Slot.Rack;
                    var daysOverdue = (now.Date - expirationDate.Date).Days;
                    var message = $"EXPIRED: {count}x '{product.Name}' (Barcode: {product.ScanCode}) " +
                                 $"in rack {rack.Code} expired on {expirationDate:yyyy-MM-dd}. " +
                                 $"Days overdue: {daysOverdue}";

                    await CreateAlertIfNotExists(rackId, AlertType.ExpirationExpired, message, product.Id);
                    await ResolveExpirationAlertsForProduct(product.Id, rackId, AlertType.ExpirationWarning);
                }
                else if (expirationDate <= warningThreshold)
                {
                    var rack = earliestItem.Slot.Rack;
                    var daysRemaining = (expirationDate.Date - now.Date).Days;
                    var message = $"WARNING: {count}x '{product.Name}' (Barcode: {product.ScanCode}) " +
                                 $"in rack {rack.Code} expires in {daysRemaining} days " +
                                 $"(Expiration: {expirationDate:yyyy-MM-dd}).";

                    await CreateAlertIfNotExists(rackId, AlertType.ExpirationWarning, message, product.Id);
                }
                else
                {
                    await ResolveExpirationAlertsForProduct(product.Id, rackId);
                }
            }

            // Resolve alerts for products no longer present on this rack
            var orphanedAlerts = await context.Alerts
                .Where(a => a.RackId == rackId && !a.IsResolved && a.ProductDefinitionId.HasValue &&
                            (a.Type == AlertType.ExpirationWarning || a.Type == AlertType.ExpirationExpired))
                .ToListAsync();

            foreach (var alert in orphanedAlerts.Where(a => !activeProductIds.Contains(a.ProductDefinitionId!.Value)))
            {
                alert.IsResolved = true;
                alert.ResolvedAt = DateTime.UtcNow;
                alert.Message += " [RESOLVED: Product no longer in stock on this rack]";
                logger.LogInformation($"Expiration alert {alert.Id} auto-resolved after operation (product {alert.ProductDefinitionId} removed from rack {rackId})");
            }

            await context.SaveChangesAsync();
        }
        
        // Helper method to auto-resolve expiration alerts for a specific product on a rack.
        // Uses ProductDefinitionId FK for precise matching instead of string-based message scanning.
        // Optionally filter by a specific alert type (e.g. resolve only warnings when product expires).
        private async Task ResolveExpirationAlertsForProduct(int productId, int rackId, AlertType? specificType = null)
        {
            var query = context.Alerts
                .Where(a => a.RackId == rackId &&
                            a.ProductDefinitionId == productId &&
                            !a.IsResolved);

            if (specificType.HasValue)
            {
                query = query.Where(a => a.Type == specificType.Value);
            }
            else
            {
                query = query.Where(a => a.Type == AlertType.ExpirationWarning || a.Type == AlertType.ExpirationExpired);
            }

            var activeAlerts = await query.ToListAsync();

            foreach (var alert in activeAlerts)
            {
                alert.IsResolved = true;
                alert.ResolvedAt = DateTime.UtcNow;
                alert.Message += " [RESOLVED: Item status updated or removed from inventory]";
                logger.LogInformation($"Expiration alert {alert.Id} auto-resolved for product {productId} in rack {rackId}");
            }
        }
    }
}
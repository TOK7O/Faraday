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
        private readonly IAlertNotificationService _notificationService;
        private readonly IConfiguration _configuration;

        public MonitoringService(
            FaradayDbContext context,
            ILogger<MonitoringService> logger,
            IAlertNotificationService notificationService,
            IConfiguration configuration)
        {
            _context = context;
            _logger = logger;
            _notificationService = notificationService;
            _configuration = configuration;
        }

        public async Task ProcessRackReadingAsync(int rackId, decimal temperature, decimal measuredWeight)
        {
            // Fetch current rack state including slots and products to calculate expected values
            var rack = await _context.Racks
                .Include(r => r.Slots)
                .ThenInclude(s => s.CurrentItem)
                .ThenInclude(i => i!.Product)
                .FirstOrDefaultAsync(r => r.Id == rackId);
            
            _logger.LogDebug("Processing rack reading for Rack {RackCode}: Temp={Temperature}°C, Weight={Weight}kg", 
                rack.Code, temperature, measuredWeight);
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
            _logger.LogTrace("Rack {RackCode} expected weight: {ExpectedWeight}kg, measured: {MeasuredWeight}kg", 
                rack.Code, expectedWeight, measuredWeight);
            
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
                var alert = new Alert
                {
                    RackId = rackId,
                    Type = type,
                    Message = message,
                    CreatedAt = DateTime.UtcNow,
                    IsResolved = false
                };

                _context.Alerts.Add(alert);
                await _context.SaveChangesAsync(); // Save first to get alert.Id
        
                _logger.LogWarning($"Alert created for Rack {rackId}: {message}");
        
                // Send real-time notification to frontend via SignalR
                await _notificationService.SendNewAlertNotificationAsync(alert);
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
        
        public async Task CheckExpirationDatesAsync()
        {
            var warningDays = _configuration.GetValue("Monitoring:ExpirationWarningDays", 7);

            var now = DateTime.UtcNow;
            var warningThreshold = now.AddDays(warningDays);

            // Group items by product and rack to avoid duplicate alerts
            var itemsWithExpiration = await _context.InventoryItems
                .Include(i => i.Product)
                .Include(i => i.Slot)
                .ThenInclude(s => s.Rack)
                .Where(i => i.ExpirationDate != null && i.Status == ItemStatus.InStock)
                .GroupBy(i => new { i.ProductDefinitionId, i.Slot.RackId })
                .Select(g => new
                {
                    ProductId = g.Key.ProductDefinitionId,
                    RackId = g.Key.RackId,
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

                // Check if product is already expired
                if (expirationDate < now)
                {
                    var daysOverdue = (now - expirationDate).Days;
                    var message = $"EXPIRED: {count}x '{product.Name}' (Barcode: {product.ScanCode}) " +
                                 $"in rack {rack.Code} expired on {expirationDate:yyyy-MM-dd}. " +
                                 $"Days overdue: {daysOverdue}";

                    await CreateAlertIfNotExists(rack.Id, AlertType.ExpirationExpired, message);
                }
                // Check if product is expiring soon
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
                    await ResolveExpirationAlertsForProduct(product.Id, rack.Id);
                }
            }

            await _context.SaveChangesAsync();
        }
        // Helper method to auto-resolve expiration alerts when item is OK or removed
        private async Task ResolveExpirationAlertsForProduct(int productId, int rackId)
        {
            var activeAlerts = await _context.Alerts
                .Where(a => a.RackId == rackId &&
                            !a.IsResolved &&
                            (a.Type == AlertType.ExpirationWarning || a.Type == AlertType.ExpirationExpired))
                .ToListAsync();

            // Get product info for matching
            var product = await _context.Products.FindAsync(productId);
            if (product == null) return;

            foreach (var alert in activeAlerts.Where(a => a.Message.Contains(product.ScanCode)))
            {
                alert.IsResolved = true;
                alert.ResolvedAt = DateTime.UtcNow;
                alert.Message += " [RESOLVED: Item status updated or removed from inventory]";
                _logger.LogInformation($"Expiration alert {alert.Id} auto-resolved for product {productId} in rack {rackId}");
            }
        }
    }
}
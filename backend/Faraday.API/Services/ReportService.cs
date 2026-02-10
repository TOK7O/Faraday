using Microsoft.EntityFrameworkCore;
using Faraday.API.Data;
using Faraday.API.DTOs;
using Faraday.API.Models;
using Faraday.API.Services.Interfaces;

namespace Faraday.API.Services
{
    /// <summary>
    /// Service responsible for generating analytical data, dashboards, and operational reports.
    /// Focuses on read-heavy operations, aggregating data from multiple entities.
    /// </summary>
    public class ReportService : IReportService
    {
        private readonly FaradayDbContext _context;
        private readonly ILogger<ReportService> _logger; 
        public ReportService(
            FaradayDbContext context,
            ILogger<ReportService> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Aggregates high-level metrics for the main application dashboard.
        /// Provides an immediate snapshot of warehouse health (capacity, occupancy, alerts).
        /// </summary>
        public async Task<DashboardStatsDto> GetDashboardStatsAsync()
        {
            _logger.LogInformation("Calculating dashboard statistics");
            // Calculate slots statistics
            var totalSlots = await _context.RackSlots.CountAsync();
            var occupiedSlots = await _context.InventoryItems.CountAsync(i => i.Status == ItemStatus.InStock);
            
            // Calculate weight statistics
            // We sum up the weight of all active items and the capacity of all active racks
            var totalWeight = await _context.InventoryItems
                .Include(i => i.Product)
                .SumAsync(i => i.Product.WeightKg);

            var totalCapacity = await _context.Racks
                .Where(r => r.IsActive)
                .SumAsync(r => r.MaxWeightKg);
            
            var expirationThreshold = DateTime.UtcNow.AddDays(7);
            var expiringCount = await _context.InventoryItems
                .CountAsync(i => i.ExpirationDate != null && i.ExpirationDate <= expirationThreshold);

            var today = DateTime.UtcNow.Date;
            var operationsToday = await _context.OperationLogs
                .CountAsync(l => l.Timestamp >= today);

            return new DashboardStatsDto
            {
                TotalSlots = totalSlots,
                OccupiedSlots = occupiedSlots,
                FreeSlots = totalSlots - occupiedSlots,
                OccupancyPercentage = totalSlots > 0 ? Math.Round((double)occupiedSlots / totalSlots * 100, 2) : 0,
                TotalWeightKg = totalWeight,
                TotalCapacityKg = totalCapacity,
                ExpiringItemsCount = expiringCount,
                OperationsToday = operationsToday
            };
        }

        /// <summary>
        /// Generates a summarized view of inventory grouped by Product ScanCode.
        /// Useful for inventory managers to see total counts of a specific product regardless of location.
        /// </summary>
        public async Task<List<InventorySummaryDto>> GetInventorySummaryAsync()
        {
            _logger.LogInformation("Generating inventory summary report");
            // Group by product definition to get aggregated view.
            var summary = await _context.InventoryItems
                .Include(i => i.Product)
                .GroupBy(i => new { i.Product.Name, i.Product.ScanCode })
                .Select(g => new InventorySummaryDto
                {
                    ProductName = g.Key.Name,
                    Barcode = g.Key.ScanCode,
                    TotalQuantity = g.Count(),
                    BlockedQuantity = g.Count(x => x.Status != ItemStatus.InStock),
                    NextExpirationDate = g.Min(x => x.ExpirationDate) // Earliest expiration date
                })
                .OrderBy(x => x.ProductName)
                .ToListAsync();

            return summary;
        }

        /// <summary>
        /// Identifies inventory items that are approaching their expiration date within a specified threshold.
        /// </summary>
        public async Task<List<ExpiringItemDto>> GetExpiringItemsAsync(int daysThreshold)
        {
            _logger.LogInformation("Fetching expiring items with threshold: {Days} days", daysThreshold);
            var thresholdDate = DateTime.UtcNow.AddDays(daysThreshold);

            // Filter items approaching expiration date
            // Includes slot/rack details to help operators physically locate the items for removal/sale.
            var items = await _context.InventoryItems
                .Include(i => i.Product)
                .Include(i => i.Slot)
                .ThenInclude(s => s.Rack)
                .Where(i => i.ExpirationDate != null && i.ExpirationDate <= thresholdDate)
                .OrderBy(i => i.ExpirationDate)
                .Select(i => new ExpiringItemDto
                {
                    Id = i.Id,
                    ProductName = i.Product.Name,
                    Barcode = i.Product.ScanCode,
                    ExpirationDate = i.ExpirationDate,
                    DaysRemaining = (i.ExpirationDate!.Value - DateTime.UtcNow).Days,
                    LocationCode = $"{i.Slot.Rack.Code} [{i.Slot.X},{i.Slot.Y}]"
                })
                .ToListAsync();

            return items;
        }

        /// <summary>
        /// Analyzes the efficiency of space and weight usage per rack.
        /// </summary>
        public async Task<List<RackUtilizationDto>> GetRackUtilizationAsync()
        {
            _logger.LogInformation("Calculating rack utilization statistics");
            // Analyze each rack's load regarding slots and weight.
            var racks = await _context.Racks
                .Where(r => r.IsActive)
                .Select(r => new
                {
                    r.Code,
                    TotalSlots = r.Slots.Count,
                    OccupiedSlots = r.Slots.Count(s => s.CurrentItem != null),
                    MaxWeight = r.MaxWeightKg,
                    // Summing weight of items currently in the rack
                    CurrentWeight = r.Slots
                        .Where(s => s.CurrentItem != null)
                        .Sum(s => s.CurrentItem!.Product.WeightKg)
                })
                .ToListAsync();
            
            return racks.Select(r => new RackUtilizationDto
            {
                RackCode = r.Code,
                TotalSlots = r.TotalSlots,
                OccupiedSlots = r.OccupiedSlots,
                SlotUtilizationPercentage = r.TotalSlots > 0 
                    ? Math.Round((double)r.OccupiedSlots / r.TotalSlots * 100, 2) 
                    : 0,
                MaxWeightKg = r.MaxWeight,
                CurrentWeightKg = r.CurrentWeight,
                WeightUtilizationPercentage = r.MaxWeight > 0 
                    ? Math.Round((double)r.CurrentWeight / (double)r.MaxWeight * 100, 2) 
                    : 0
            }).OrderByDescending(r => r.WeightUtilizationPercentage).ToList();
        }

        /// <summary>
        /// Retrieves historical sensor data for temperature analysis.
        /// </summary>
        public async Task<List<TemperatureHistoryDto>> GetTemperatureHistoryAsync(
            int? rackId = null, 
            DateTime? fromDate = null, 
            DateTime? toDate = null, 
            int limit = 100)
        {
            _logger.LogInformation("Fetching temperature history. RackId: {RackId}, FromDate: {FromDate}, ToDate: {ToDate}, Limit: {Limit}", 
                rackId, fromDate?.ToString("yyyy-MM-dd") ?? "ALL", toDate?.ToString("yyyy-MM-dd") ?? "NOW", limit);
            var query = _context.TemperatureReadings
                .Include(t => t.Rack)
                .AsQueryable();

            // Apply rack filter if specified
            if (rackId.HasValue)
            {
                query = query.Where(t => t.RackId == rackId.Value);
            }

            // Apply date range filters
            if (fromDate.HasValue)
            {
                query = query.Where(t => t.Timestamp >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                query = query.Where(t => t.Timestamp <= toDate.Value);
            }

            // Sort by most recent first and apply limit
            var readings = await query
                .OrderByDescending(t => t.Timestamp)
                .Take(limit)
                .Select(t => new TemperatureHistoryDto
                {
                    Id = t.Id,
                    RackCode = t.Rack.Code,
                    RecordedTemperature = t.RecordedTemperature,
                    Timestamp = t.Timestamp
                })
                .ToListAsync();

            return readings;
        }

        /// <summary>
        /// Retrieves historical sensor data for weight analysis.
        /// </summary>
        public async Task<List<WeightHistoryDto>> GetWeightHistoryAsync(
            int? rackId = null, 
            DateTime? fromDate = null, 
            DateTime? toDate = null, 
            int limit = 100)
        {
            _logger.LogInformation("Fetching weight history. RackId: {RackId}, FromDate: {FromDate}, ToDate: {ToDate}, Limit: {Limit}", 
                rackId, fromDate?.ToString("yyyy-MM-dd") ?? "ALL", toDate?.ToString("yyyy-MM-dd") ?? "NOW", limit);
            
            var query = _context.WeightReadings
                .Include(w => w.Rack)
                .AsQueryable();

            if (rackId.HasValue)
            {
                query = query.Where(w => w.RackId == rackId.Value);
            }

            if (fromDate.HasValue)
            {
                query = query.Where(w => w.Timestamp >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                query = query.Where(w => w.Timestamp <= toDate.Value);
            }

            var readings = await query
                .OrderByDescending(w => w.Timestamp)
                .Take(limit)
                .Select(w => new WeightHistoryDto
                {
                    Id = w.Id,
                    RackCode = w.Rack.Code,
                    MeasuredWeightKg = w.MeasuredWeightKg,
                    ExpectedWeightKg = w.ExpectedWeightKg,
                    DiscrepancyKg = w.MeasuredWeightKg - w.ExpectedWeightKg,
                    Timestamp = w.Timestamp
                })
                .ToListAsync();

            return readings;
        }

        /// <summary>
        /// Retrieves the audit log of all alerts (both resolved and unresolved).
        /// </summary>
        public async Task<List<AlertHistoryDto>> GetAlertHistoryAsync(
            int? rackId = null, 
            DateTime? fromDate = null, 
            DateTime? toDate = null)
        {
            _logger.LogInformation("Fetching alert history. RackId: {RackId}, FromDate: {FromDate}, ToDate: {ToDate}", 
                rackId, fromDate?.ToString("yyyy-MM-dd") ?? "ALL", toDate?.ToString("yyyy-MM-dd") ?? "NOW");
            
            var query = _context.Alerts
                .Include(a => a.Rack)
                .AsQueryable();

            if (rackId.HasValue)
            {
                query = query.Where(a => a.RackId == rackId.Value);
            }

            if (fromDate.HasValue)
            {
                query = query.Where(a => a.CreatedAt >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                query = query.Where(a => a.CreatedAt <= toDate.Value);
            }

            var alerts = await query
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new AlertHistoryDto
                {
                    Id = a.Id,
                    RackCode = a.Rack != null ? a.Rack.Code : null,
                    Message = a.Message,
                    Type = a.Type.ToString(),
                    IsResolved = a.IsResolved,
                    CreatedAt = a.CreatedAt,
                    ResolvedAt = a.ResolvedAt
                })
                .ToListAsync();

            return alerts;
        }

        /// <summary>
        /// Fetches only currently unresolved alerts for operational dashboard displays.
        /// </summary>
        public async Task<List<ActiveAlertDto>> GetActiveAlertsAsync()
        {
            _logger.LogInformation("Fetching active unresolved alerts");
            var activeAlerts = await _context.Alerts
                .Include(a => a.Rack)
                .Where(a => !a.IsResolved)
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new ActiveAlertDto
                {
                    Id = a.Id,
                    RackCode = a.Rack != null ? a.Rack.Code : null,
                    Message = a.Message,
                    Type = a.Type.ToString(),
                    CreatedAt = a.CreatedAt,
                    // Calculate duration in minutes from creation to now
                    DurationMinutes = (int)(DateTime.UtcNow - a.CreatedAt).TotalMinutes
                })
                .ToListAsync();

            return activeAlerts;
        }

        /// <summary>
        /// Reports instances where a rack's sensor readings violated the rack's own configured limits.
        /// </summary>
        public async Task<List<RackTemperatureViolationDto>> GetRackTemperatureViolationsAsync(
            int? rackId = null,
            DateTime? fromDate = null,
            DateTime? toDate = null,
            int limit = 200)
        {
            _logger.LogInformation("Fetching rack temperature violations. RackId: {RackId}, FromDate: {FromDate}, ToDate: {ToDate}, Limit: {Limit}", 
                rackId, fromDate?.ToString("yyyy-MM-dd") ?? "ALL", toDate?.ToString("yyyy-MM-dd") ?? "NOW", limit);
            
            var query = _context.TemperatureReadings
                .Include(t => t.Rack)
                .Where(t => t.RecordedTemperature < t.Rack.MinTemperature || 
                           t.RecordedTemperature > t.Rack.MaxTemperature)
                .AsQueryable();

            if (rackId.HasValue)
            {
                query = query.Where(t => t.RackId == rackId.Value);
            }

            if (fromDate.HasValue)
            {
                query = query.Where(t => t.Timestamp >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                query = query.Where(t => t.Timestamp <= toDate.Value);
            }

            var violations = await query
                .OrderByDescending(t => t.Timestamp)
                .Take(limit)
                .Select(t => new
                {
                    t.Id,
                    t.Rack.Code,
                    t.RecordedTemperature,
                    t.Rack.MinTemperature,
                    t.Rack.MaxTemperature,
                    t.Timestamp
                })
                .ToListAsync();

            // Calculate violation details in memory
            return violations.Select(v => new RackTemperatureViolationDto
            {
                ReadingId = v.Id,
                RackCode = v.Code,
                RecordedTemperature = v.RecordedTemperature,
                AllowedMinTemperature = v.MinTemperature,
                AllowedMaxTemperature = v.MaxTemperature,
                ViolationType = v.RecordedTemperature > v.MaxTemperature ? "TooHot" : "TooCold",
                ViolationDegrees = v.RecordedTemperature > v.MaxTemperature 
                    ? v.RecordedTemperature - v.MaxTemperature 
                    : v.MinTemperature - v.RecordedTemperature,
                Timestamp = v.Timestamp
            }).ToList();
        }

        /// <summary>
        /// Reports instances where environmental conditions violated the safety requirements of the stored products.
        /// </summary>
        public async Task<List<ItemTemperatureViolationDto>> GetItemTemperatureViolationsAsync(
            DateTime? fromDate = null,
            DateTime? toDate = null)
        {
            _logger.LogInformation("Querying item temperature violations. DateRange: {FromDate} to {ToDate}", 
                fromDate?.ToString("yyyy-MM-dd") ?? "ALL", 
                toDate?.ToString("yyyy-MM-dd") ?? "NOW");
            
            // Build query for temperature readings that violate product requirements
            var query = from reading in _context.TemperatureReadings
                        join rack in _context.Racks on reading.RackId equals rack.Id
                        join slot in _context.RackSlots on rack.Id equals slot.RackId
                        join item in _context.InventoryItems on slot.Id equals item.RackSlotId
                        join product in _context.Products on item.ProductDefinitionId equals product.Id
                        where reading.RecordedTemperature < product.RequiredMinTemp ||
                              reading.RecordedTemperature > product.RequiredMaxTemp
                        select new
                        {
                            item.Id,
                            product.Name,
                            product.ScanCode,
                            rack.Code,
                            slot.X,
                            slot.Y,
                            reading.RecordedTemperature,
                            product.RequiredMinTemp,
                            product.RequiredMaxTemp,
                            reading.Timestamp
                        };

            if (fromDate.HasValue)
            {
                query = query.Where(x => x.Timestamp >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                query = query.Where(x => x.Timestamp <= toDate.Value);
            }

            var violations = await query
                .OrderByDescending(x => x.Timestamp)
                .ToListAsync();

            _logger.LogInformation("Found {Count} item temperature violations", violations.Count);
            
            // Calculate violation details
            return violations.Select(v => new ItemTemperatureViolationDto
            {
                ItemId = v.Id,
                ProductName = v.Name,
                Barcode = v.ScanCode,
                RackCode = v.Code,
                SlotX = v.X,
                SlotY = v.Y,
                RecordedTemperature = v.RecordedTemperature,
                RequiredMinTemperature = v.RequiredMinTemp,
                RequiredMaxTemperature = v.RequiredMaxTemp,
                ViolationType = v.RecordedTemperature > v.RequiredMaxTemp ? "TooHot" : "TooCold",
                ViolationDegrees = v.RecordedTemperature > v.RequiredMaxTemp
                    ? v.RecordedTemperature - v.RequiredMaxTemp
                    : v.RequiredMinTemp - v.RecordedTemperature,
                ViolationTimestamp = v.Timestamp
            }).ToList();
            
        }

        /// <summary>
        /// Generates a massive, flat-list report of every single item in the warehouse with all related details.
        /// </summary>
        public async Task<List<FullInventoryDto>> GetFullInventoryReportAsync()
        {
            _logger.LogInformation("Generating full inventory report...");
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            
            var inventory = await _context.InventoryItems
                .Include(i => i.Product)
                .Include(i => i.Slot)
                    .ThenInclude(s => s.Rack)
                .Include(i => i.ReceivedByUser)
                .OrderBy(i => i.Slot.Rack.Code)
                    .ThenBy(i => i.Slot.Y)
                    .ThenBy(i => i.Slot.X)
                .Select(i => new FullInventoryDto
                {
                    ItemId = i.Id,
                    
                    // Product details
                    ProductId = i.Product.Id,
                    ProductName = i.Product.Name,
                    Barcode = i.Product.ScanCode,
                    ProductPhotoUrl = i.Product.PhotoUrl,
                    ProductWeightKg = i.Product.WeightKg,
                    
                    // Location details
                    RackCode = i.Slot.Rack.Code,
                    SlotX = i.Slot.X,
                    SlotY = i.Slot.Y,
                    LocationCode = $"{i.Slot.Rack.Code} [{i.Slot.X},{i.Slot.Y}]",
                    
                    // Status and dates
                    Status = i.Status.ToString(),
                    EntryDate = i.EntryDate,
                    ExpirationDate = i.ExpirationDate,
                    DaysUntilExpiration = i.ExpirationDate != null 
                        ? (int)(i.ExpirationDate.Value - DateTime.UtcNow).TotalDays 
                        : null,
                    
                    // Temperature conditions
                    CurrentRackTemperature = i.Slot.Rack.CurrentTemperature ?? 0,
                    RequiredMinTemp = i.Product.RequiredMinTemp,
                    RequiredMaxTemp = i.Product.RequiredMaxTemp,
                    
                    // User info
                    ReceivedByUsername = i.ReceivedByUser.Username,
                    
                    // Hazard info
                    IsHazardous = i.Product.IsHazardous,
                    HazardClassification = i.Product.IsHazardous 
                        ? i.Product.HazardClassification.ToString() 
                        : null
                })
                .ToListAsync();
            
            stopwatch.Stop();
            _logger.LogInformation("Full inventory report generated. Items: {Count}, Time: {ElapsedMs}ms", 
                inventory.Count, stopwatch.ElapsedMilliseconds);
            
            return inventory;
        }
    }
}
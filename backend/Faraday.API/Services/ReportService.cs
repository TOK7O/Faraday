using Microsoft.EntityFrameworkCore;
using Faraday.API.Data;
using Faraday.API.DTOs;
using Faraday.API.Models;
using Faraday.API.Services.Interfaces;

namespace Faraday.API.Services
{
    public class ReportService : IReportService
    {
        private readonly FaradayDbContext _context;

        public ReportService(FaradayDbContext context)
        {
            _context = context;
        }

        public async Task<DashboardStatsDto> GetDashboardStatsAsync()
        {
            // Calculate slots statistics
            var totalSlots = await _context.RackSlots.CountAsync();
            var occupiedSlots = await _context.InventoryItems.CountAsync(i => i.Status == ItemStatus.InStock);
            
            // Calculate weight statistics
            // Note: We sum up the weight of all active items and the capacity of all active racks
            var totalWeight = await _context.InventoryItems
                .Include(i => i.Product)
                .SumAsync(i => i.Product.WeightKg);

            var totalCapacity = await _context.Racks
                .Where(r => r.IsActive)
                .SumAsync(r => r.MaxWeightKg);

            // Calculate alerts
            var expirationThreshold = DateTime.UtcNow.AddDays(7); // Default 7 days logic for dashboard
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

        public async Task<List<InventorySummaryDto>> GetInventorySummaryAsync()
        {
            // Group by product definition to get aggregated view
            // using SQL groupby for performance optimization
            var summary = await _context.InventoryItems
                .Include(i => i.Product)
                .GroupBy(i => new { i.Product.Name, i.Product.ScanCode })
                .Select(g => new InventorySummaryDto
                {
                    ProductName = g.Key.Name,
                    Barcode = g.Key.ScanCode,
                    TotalQuantity = g.Count(),
                    BlockedQuantity = g.Count(x => x.Status != ItemStatus.InStock),
                    NextExpirationDate = g.Min(x => x.ExpirationDate)
                })
                .OrderBy(x => x.ProductName)
                .ToListAsync();

            return summary;
        }

        public async Task<List<ExpiringItemDto>> GetExpiringItemsAsync(int daysThreshold)
        {
            var thresholdDate = DateTime.UtcNow.AddDays(daysThreshold);

            // Filter items approaching expiration date
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

        public async Task<List<RackUtilizationDto>> GetRackUtilizationAsync()
        {
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

            // Map to DTO
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
    }
}
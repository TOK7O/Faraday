using Microsoft.EntityFrameworkCore;
using Faraday.API.Data;
using Faraday.API.Models;
using Faraday.API.Services.Interfaces;

namespace Faraday.API.Services
{
    public class WarehouseAlgorithmService : IWarehouseAlgorithmService
    {
        private readonly FaradayDbContext _context;
        private readonly ILogger<WarehouseAlgorithmService> _logger;

        public WarehouseAlgorithmService(FaradayDbContext context, ILogger<WarehouseAlgorithmService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<RackSlot> FindBestSlotForProductAsync(int productDefinitionId)
        {
            // Fetch the product definition
            var product = await _context.Products.FindAsync(productDefinitionId);
            if (product == null)
                throw new KeyNotFoundException($"Product definition {productDefinitionId} not found.");
            
            // Fetch candidate racks
            var candidateRacks = await _context.Racks
                .Include(r => r.Slots)
                    .ThenInclude(s => s.CurrentItem)
                        .ThenInclude(i => i!.Product)
                .Where(r => r.IsActive
                            // Dimension constraints (Rack must fit the item)
                            && r.MaxItemWidthMm >= product.WidthMm
                            && r.MaxItemHeightMm >= product.HeightMm
                            && r.MaxItemDepthMm >= product.DepthMm
                            // Temperature constraints (Rack must be safe for the product)
                            // The rack's range must cover the product's requirement.
                            // So basically, if a product requires 2-6C, then the rack needs
                            // to provide 2-6, or 3-6, or 4-5, etc.
                            && r.MinTemperature >= product.RequiredMinTemp
                            && r.MaxTemperature <= product.RequiredMaxTemp)
                .OrderBy(r => r.Code)
                .ToListAsync();

            if (!candidateRacks.Any())
            {
                throw new InvalidOperationException($"No racks found meeting requirements for '{product.Name}' " +
                    $"(Dim: {product.WidthMm}x{product.HeightMm}x{product.DepthMm} mm, " +
                    $"Temp: {product.RequiredMinTemp} to {product.RequiredMaxTemp}°C). Check rack definitions.");
            }
            
            foreach (var rack in candidateRacks)
            {
                // Check Rack Weight Limit (Total Rack Load)
                // We sum up the weight of all items currently in this rack.
                var currentLoad = rack.Slots
                    .Where(s => s.CurrentItem != null)
                    .Sum(s => s.CurrentItem!.Product.WeightKg);

                if (currentLoad + product.WeightKg > rack.MaxWeightKg)
                {
                    _logger.LogWarning($"Rack {rack.Code} skipped. Weight limit exceeded ({currentLoad + product.WeightKg}/{rack.MaxWeightKg} kg).");
                    continue; 
                }

                // First Fit (Bottom-Up, Left-to-Right)
                // Heaviest items should go lower for stability.
                var freeSlot = rack.Slots
                    .Where(s => s.Status == RackSlotStatus.Available && s.CurrentItem == null)
                    .OrderBy(s => s.Y) // Bottom shelves first
                    .ThenBy(s => s.X)  // Then left to right
                    .FirstOrDefault();

                if (freeSlot != null)
                {
                    _logger.LogInformation($"Algorithm: Found slot {freeSlot.Id} (Rack {rack.Code}, Pos [{freeSlot.X},{freeSlot.Y}]) for Product '{product.Name}'");
                    return freeSlot;
                }
            }

            throw new InvalidOperationException($"No available slots found in {candidateRacks.Count} compatible racks. " +
                                                "Racks are either full or adding this item would exceed the rack's weight limit.");
        }
    }
}
using Microsoft.EntityFrameworkCore;
using Faraday.API.Data;
using Faraday.API.Models;
using Faraday.API.Services.Interfaces;

namespace Faraday.API.Services
{
    /// <summary>
    /// The "Brain" of the WMS. Determines the optimal storage location for incoming inventory.
    /// Implements specific strategies (like Bottom-Up filling) and validates physical/environmental constraints.
    /// </summary>
    public class WarehouseAlgorithmService(FaradayDbContext context, ILogger<WarehouseAlgorithmService> logger)
        : IWarehouseAlgorithmService
    {
        /// <summary>
        /// Scans the warehouse for the best available slot for a specific product.
        /// Considers dimensions, temperature compatibility, and rack weight capacity.
        /// </summary>
        /// <param name="productDefinitionId">The ID of the product being received.</param>
        /// <returns>The allocated RackSlot entity.</returns>
        public async Task<RackSlot> FindBestSlotForProductAsync(int productDefinitionId)
        {
            // Fetch the product definition
            var product = await context.Products.FindAsync(productDefinitionId);
            if (product == null)
                throw new KeyNotFoundException($"Product definition {productDefinitionId} not found.");
            
            // Fetch candidate racks
            var candidateRacks = await context.Racks
                .Include(r => r.Slots)
                    .ThenInclude(s => s.CurrentItem)
                        .ThenInclude(i => i!.Product)
                .Where(r => r.IsActive
                            // Dimension constraints (Rack must fit the item)
                            && r.MaxItemWidthMm >= product.WidthMm
                            && r.MaxItemHeightMm >= product.HeightMm
                            && r.MaxItemDepthMm >= product.DepthMm
                            // Temperature constraints (Rack must be safe for the product)
                            // The rack's operating range must be a SUBSET of the product's safe range.
                            // Example: Product needs 0-10°C. Rack operates at 2-5°C. This is valid.
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
                // We sum up the weight of all items currently in this rack to ensure structural integrity.
                var currentLoad = rack.Slots
                    .Where(s => s.CurrentItem != null)
                    .Sum(s => s.CurrentItem!.Product.WeightKg);

                if (currentLoad + product.WeightKg > rack.MaxWeightKg)
                {
                    logger.LogWarning($"Rack {rack.Code} skipped. Weight limit exceeded ({currentLoad + product.WeightKg}/{rack.MaxWeightKg} kg).");
                    continue; 
                }

                // First Fit (Bottom-Up, Left-to-Right) strategy.
                var freeSlot = rack.Slots
                    .Where(s => s.Status == RackSlotStatus.Available && s.CurrentItem == null)
                    .OrderBy(s => s.Y) // Bottom shelves first
                    .ThenBy(s => s.X)  // Then left to right
                    .FirstOrDefault();

                if (freeSlot != null)
                {
                    logger.LogInformation($"Algorithm: Found slot {freeSlot.Id} (Rack {rack.Code}, Pos [{freeSlot.X},{freeSlot.Y}]) for Product '{product.Name}'");
                    return freeSlot;
                }
            }
            
            logger.LogWarning("No available slots found for product '{ProductName}' (ID: {ProductId}) " +
                               "after checking {RackCount} compatible racks. " +
                               "All racks are either full or would exceed weight limits",
                                product.Name, productDefinitionId, candidateRacks.Count);
            
            throw new InvalidOperationException($"No available slots found in {candidateRacks.Count} " +
                                                $"compatible racks. Racks are either full or adding this " +
                                                $"item would exceed the rack's weight limit.");
        }
    }
}
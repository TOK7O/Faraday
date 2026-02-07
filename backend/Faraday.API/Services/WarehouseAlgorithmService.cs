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
            // Validate existence of the product definition before processing allocation.
            var product = await _context.Products.FindAsync(productDefinitionId);
            if (product == null)
                throw new KeyNotFoundException($"Product definition {productDefinitionId} not found.");

            // Retrieve all active racks.
            // Load slots, inventory items, and their product definitions to have this data ready to be computed and calculate
            // the optimal spot for placing the item.
            var racks = await _context.Racks
                .Include(r => r.Slots)
                    .ThenInclude(s => s.CurrentItem)
                        .ThenInclude(i => i!.Product)
                .Where(r => r.IsActive)
                .ToListAsync();

            _logger.LogInformation($"Algorithm: Searching slot for '{product.Name}' (Temp: {product.RequiredMinTemp}-{product.RequiredMaxTemp}, W: {product.WeightKg}kg)");

            // Environmental constraints.
            // The rack's temperature range must fully encompass the product's required storage conditions.
            var tempCompatibleRacks = racks.Where(r => 
                r.MinTemperature <= product.RequiredMinTemp && 
                r.MaxTemperature >= product.RequiredMaxTemp
            ).ToList();

            if (!tempCompatibleRacks.Any())
                throw new InvalidOperationException($"No racks found meeting temperature requirements ({product.RequiredMinTemp} to {product.RequiredMaxTemp}).");

            // Physical dimensions.
            // Ensure the product physically fits within the maximum defined slot dimensions for the rack.
            var dimensionCompatibleRacks = tempCompatibleRacks.Where(r =>
                product.WidthMm <= r.MaxItemWidthMm &&
                product.HeightMm <= r.MaxItemHeightMm &&
                product.DepthMm <= r.MaxItemDepthMm
            ).ToList();

            if (!dimensionCompatibleRacks.Any())
                throw new InvalidOperationException("No racks found meeting dimension requirements.");

            // Capacity and slot availability.
            // Iterate through remaining racks to check dynamic weight limits (Sum of existing items + new item).
            // Select the first available slot using a Bottom-Up, Left-to-Right filling strategy to ensure rack stability.
            foreach (var rack in dimensionCompatibleRacks)
            {
                // Calculate current load of the rack.
                var currentLoad = rack.Slots
                    .Where(s => s.CurrentItem != null)
                    .Sum(s => s.CurrentItem!.Product.WeightKg);

                // Skip rack if adding the new product exceeds the safe load.
                if (currentLoad + product.WeightKg > rack.MaxWeightKg)
                {
                    continue; 
                }

                var freeSlot = rack.Slots
                    .OrderBy(s => s.Y).ThenBy(s => s.X)
                    .FirstOrDefault(s => s.Status == RackSlotStatus.Available && s.CurrentItem == null);

                if (freeSlot != null)
                {
                    _logger.LogInformation($"Algorithm: Found slot {freeSlot.Id} (Rack {rack.Code}, Pos {freeSlot.X},{freeSlot.Y})");
                    return freeSlot;
                }
            }

            throw new InvalidOperationException("No available slots found in compatible racks (Weight limit or Full).");
        }
    }
}
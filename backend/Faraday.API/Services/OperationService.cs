using Microsoft.EntityFrameworkCore;
using Faraday.API.Data;
using Faraday.API.DTOs;
using Faraday.API.Models;
using Faraday.API.Services.Interfaces;

namespace Faraday.API.Services
{
    public class OperationService : IOperationService
    {
        private readonly FaradayDbContext _context;
        private readonly IWarehouseAlgorithmService _algorithm;
        private readonly ILogger<OperationService> _logger;

        public OperationService(
            FaradayDbContext context, 
            IWarehouseAlgorithmService algorithm,
            ILogger<OperationService> logger)
        {
            _context = context;
            _algorithm = algorithm;
            _logger = logger;
        }

        public async Task<OperationResultDto> ProcessInboundAsync(OperationInboundDto request, int userId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Identify product
                var product = await _context.Products.FirstOrDefaultAsync(p => p.ScanCode == request.Barcode);
                if (product == null)
                    throw new KeyNotFoundException($"Product with barcode {request.Barcode} not found.");

                // Algorithm
                var targetSlot = await _algorithm.FindBestSlotForProductAsync(product.Id);

                // Create inventory item
                DateTime? expirationDate = product.ValidityDays.HasValue 
                    ? DateTime.UtcNow.AddDays(product.ValidityDays.Value) 
                    : null;

                var inventoryItem = new InventoryItem
                {
                    ProductDefinitionId = product.Id,
                    RackSlotId = targetSlot.Id,
                    EntryDate = DateTime.UtcNow,
                    ExpirationDate = expirationDate,
                    Status = ItemStatus.InStock,
                    ReceivedByUserId = userId
                };

                // Update slot
                targetSlot.CurrentItem = inventoryItem; 
                _context.InventoryItems.Add(inventoryItem);

                // Audit log
                var log = new OperationLog
                {
                    Type = OperationType.Inbound,
                    Timestamp = DateTime.UtcNow,
                    UserId = userId,
                    ProductDefinitionId = product.Id,
                    ProductName = product.Name,
                    RackId = targetSlot.Rack.Id,
                    RackCode = targetSlot.Rack.Code,
                    Description = $"Allocated to {targetSlot.Rack.Code} [{targetSlot.X},{targetSlot.Y}]"
                };
                _context.OperationLogs.Add(log);

                // Commit
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation($"Inbound success: {product.Name} -> {targetSlot.Rack.Code}");

                return new OperationResultDto
                {
                    Success = true,
                    Message = "Inbound successful",
                    RackCode = targetSlot.Rack.Code,
                    SlotX = targetSlot.X,
                    SlotY = targetSlot.Y,
                    OperationLogId = log.Id
                };
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Inbound transaction failed.");
                throw;
            }
        }

        public async Task<OperationResultDto> ProcessOutboundAsync(OperationOutboundDto request, int userId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // FIFO
                var itemToRemove = await _context.InventoryItems
                    .Include(i => i.Slot)
                    .ThenInclude(s => s.Rack)
                    .Include(i => i.Product)
                    .Where(i => i.Product.ScanCode == request.Barcode && i.Status == ItemStatus.InStock)
                    .OrderBy(i => i.EntryDate) 
                    .FirstOrDefaultAsync();

                if (itemToRemove == null)
                    throw new InvalidOperationException($"No stock found for product {request.Barcode}.");

                var rackCode = itemToRemove.Slot.Rack.Code;
                var rackId = itemToRemove.Slot.Rack.Id;
                var slotX = itemToRemove.Slot.X;
                var slotY = itemToRemove.Slot.Y;

                // Remove
                _context.InventoryItems.Remove(itemToRemove);

                // Audit log
                var log = new OperationLog
                {
                    Type = OperationType.Outbound,
                    Timestamp = DateTime.UtcNow,
                    UserId = userId,
                    ProductDefinitionId = itemToRemove.ProductDefinitionId,
                    ProductName = itemToRemove.Product.Name,
                    RackId = rackId,
                    RackCode = rackCode,
                    Description = $"Removed from {rackCode} [{slotX},{slotY}] (FIFO)"
                };
                _context.OperationLogs.Add(log);

                // Commit
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation($"Outbound success: {request.Barcode} from {rackCode}");

                return new OperationResultDto
                {
                    Success = true,
                    Message = "Outbound successful (FIFO applied)",
                    RackCode = rackCode,
                    SlotX = slotX,
                    SlotY = slotY,
                    OperationLogId = log.Id
                };
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Outbound transaction failed.");
                throw;
            }
        }

        public async Task<OperationResultDto> ProcessMovementAsync(OperationMovementDto request, int userId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Find the specific item at source location
                // Look for an item in the specific rack/slot X/Y
                var itemToMove = await _context.InventoryItems
                    .Include(i => i.Product)
                    .Include(i => i.Slot)
                    .ThenInclude(s => s.Rack)
                    .FirstOrDefaultAsync(i => 
                        i.Slot.Rack.Code == request.SourceRackCode &&
                        i.Slot.X == request.SourceSlotX &&
                        i.Slot.Y == request.SourceSlotY &&
                        i.Status == ItemStatus.InStock);

                if (itemToMove == null)
                    throw new KeyNotFoundException($"No item found at source location {request.SourceRackCode} [{request.SourceSlotX},{request.SourceSlotY}].");

                // We check if the item matches the barcode provided - if it doesn't throw error at the user.
                if (itemToMove.Product.ScanCode != request.Barcode)
                {
                    throw new InvalidOperationException($"Mismatch. Slot contains '{itemToMove.Product.Name}' ({itemToMove.Product.ScanCode}), but you scanned '{request.Barcode}'.");
                }

                // Find target slot
                var targetRack = await _context.Racks
                    .Include(r => r.Slots)
                    .ThenInclude(s => s.CurrentItem)
                    .ThenInclude(i => i!.Product)
                    .FirstOrDefaultAsync(r => r.Code == request.TargetRackCode);

                if (targetRack == null)
                    throw new KeyNotFoundException($"Target rack {request.TargetRackCode} not found.");

                var targetSlot = targetRack.Slots.FirstOrDefault(s => s.X == request.TargetSlotX && s.Y == request.TargetSlotY);

                if (targetSlot == null)
                    throw new KeyNotFoundException($"Target slot [{request.TargetSlotX},{request.TargetSlotY}] does not exist.");

                if (targetSlot.CurrentItem != null)
                    throw new InvalidOperationException("Target slot is already occupied.");

                if (targetSlot.Status != RackSlotStatus.Available)
                    throw new InvalidOperationException("Target slot is unavailable.");
                
                var product = itemToMove.Product;

                // Temperature check
                if (targetRack.MinTemperature > product.RequiredMinTemp || targetRack.MaxTemperature < product.RequiredMaxTemp)
                {
                    throw new InvalidOperationException(
                        $"Temperature mismatch. " +
                        $"Rack: {targetRack.MinTemperature:0.##}°C - {targetRack.MaxTemperature:0.##}°C, " +
                        $"Product needs: {product.RequiredMinTemp:0.##}°C - {product.RequiredMaxTemp:0.##}°C");
                }

                // Dimensions check
                if (product.WidthMm > targetRack.MaxItemWidthMm || 
                    product.HeightMm > targetRack.MaxItemHeightMm || 
                    product.DepthMm > targetRack.MaxItemDepthMm)
                {
                    throw new InvalidOperationException("Product is too big for this rack.");
                }

                // Weight check
                var currentLoad = targetRack.Slots
                    .Where(s => s.CurrentItem != null)
                    .Sum(s => s.CurrentItem!.Product.WeightKg);
                
                if (currentLoad + product.WeightKg > targetRack.MaxWeightKg)
                {
                    throw new InvalidOperationException("Target rack weight limit exceeded.");
                }

                // Execute the move
                itemToMove.Slot.CurrentItem = null; // Clear old
                itemToMove.RackSlotId = targetSlot.Id;
                targetSlot.CurrentItem = itemToMove; // Set new

                // Audit log
                var log = new OperationLog
                {
                    Type = OperationType.Movement,
                    Timestamp = DateTime.UtcNow,
                    UserId = userId,
                    ProductDefinitionId = product.Id,
                    ProductName = product.Name,
                    RackId = targetRack.Id,
                    RackCode = targetRack.Code,
                    Description = $"Moved from {request.SourceRackCode} [{request.SourceSlotX},{request.SourceSlotY}] to {targetRack.Code} [{targetSlot.X},{targetSlot.Y}]"
                };
                _context.OperationLogs.Add(log);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation($"Moved item {product.ScanCode} from {request.SourceRackCode} to {request.TargetRackCode}");

                return new OperationResultDto
                {
                    Success = true,
                    Message = "Movement successful",
                    RackCode = targetRack.Code,
                    SlotX = targetSlot.X,
                    SlotY = targetSlot.Y,
                    OperationLogId = log.Id
                };
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Movement failed.");
                throw;
            }
        }

        public async Task<IEnumerable<OperationLogDto>> GetOperationHistoryAsync(int? limit = null)
        {
            _logger.LogDebug("Fetching operation history with limit: {Limit}", limit ?? -1);
            var query = _context.OperationLogs
                .Include(l => l.User)
                .OrderByDescending(l => l.Timestamp)
                .AsQueryable();

            if (limit.HasValue)
            {
                query = query.Take(limit.Value);
            }

            var logs = await query.ToListAsync();
            _logger.LogDebug("Retrieved {Count} operation log entries", logs.Count);
            return logs.Select(l => new OperationLogDto
            {
                Id = l.Id,
                Timestamp = l.Timestamp,
                Type = l.Type.ToString(),
                UserName = l.User?.Username ?? "System",
                ProductDefinitionId = l.ProductDefinitionId,
                ProductName = l.ProductName,
                RackId = l.RackId,
                RackCode = l.RackCode,
                Description = l.Description
            });
        }
    }
}
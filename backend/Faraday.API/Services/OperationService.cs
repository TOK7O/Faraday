using Faraday.API.Data;
using Faraday.API.DTOs;
using Faraday.API.Models;
using Faraday.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Faraday.API.Services;

/// <summary>
/// Core service for physical warehouse operations. 
/// Handles the lifecycle of inventory items: Receiving (Inbound), Shipping (Outbound), and Internal Movements.
/// Ensures data consistency using database transactions.
/// </summary>
public class OperationService(
    FaradayDbContext context,
    IWarehouseAlgorithmService algorithm,
    IServiceProvider serviceProvider,
    ILogger<OperationService> logger)
    : IOperationService
{
    /// <summary>
    /// Processes an incoming item (Receipt). 
    /// Uses the allocation algorithm to determine the best storage slot and records the inventory entry.
    /// </summary>
    /// <param name="request">Contains the scanned barcode of the incoming product.</param>
    /// <param name="userId">The ID of the operator performing the action.</param>
    public async Task<OperationResultDto> ProcessInboundAsync(OperationInboundDto request, int userId)
    {
        // We use an explicit transaction to ensure that the InventoryItem creation 
        // and the OperationLog entry are committed atomically.
        await using var transaction = await context.Database.BeginTransactionAsync();

        try
        {
            // Identify product
            var product = await context.Products.FirstOrDefaultAsync(p => p.ScanCode == request.Barcode);
            if (product == null)
                throw new KeyNotFoundException($"Product with barcode {request.Barcode} not found.");

            // Algorithm
            // Delegate the complex logic of "where should this go?" to the dedicated algorithm service.
            var targetSlot = await algorithm.FindBestSlotForProductAsync(product.Id);

            // Create an inventory item
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
            context.InventoryItems.Add(inventoryItem);

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
            context.OperationLogs.Add(log);

            // Commit
            // SaveChangesAsync generates the IDs for new entities
            // (InventoryItem, Log) before the transaction commits.
            await context.SaveChangesAsync();
            await transaction.CommitAsync();

            logger.LogInformation($"Inbound success: {product.Name} -> {targetSlot.Rack.Code}");

            // Trigger expiration check for the target rack after successful inbound
            await TriggerExpirationCheckAsync(targetSlot.Rack.Id);

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
            logger.LogError(ex, "Inbound transaction failed.");
            throw;
        }
    }

    /// <summary>
    /// Processes an outgoing item (Shipment/Picking).
    /// Implements FIFO (First-In, First-Out) logic to ensure the oldest stock is picked first.
    /// </summary>
    public async Task<OperationResultDto> ProcessOutboundAsync(OperationOutboundDto request, int userId)
    {
        await using var transaction = await context.Database.BeginTransactionAsync();

        try
        {
            // FIFO
            // We order by EntryDate ascending to pick the oldest item available.
            var itemToRemove = await context.InventoryItems
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
            // Historical data is preserved in OperationLogs.
            context.InventoryItems.Remove(itemToRemove);

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
            context.OperationLogs.Add(log);

            // Commit
            await context.SaveChangesAsync();
            await transaction.CommitAsync();

            logger.LogInformation($"Outbound success: {request.Barcode} from {rackCode}");

            // Trigger expiration check to resolve alerts for removed products
            await TriggerExpirationCheckAsync(rackId);

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
            logger.LogError(ex, "Outbound transaction failed.");
            throw;
        }
    }

    /// <summary>
    /// Handles the internal movement of an item from one specific slot to another.
    /// Unlike Inbound, this bypasses the placement algorithm, but it still validates
    /// physical constraints (dimensions, weight, temperature).
    /// </summary>
    public async Task<OperationResultDto> ProcessMovementAsync(OperationMovementDto request, int userId)
    {
        await using var transaction = await context.Database.BeginTransactionAsync();

        try
        {
            // Find the specific item at the source location
            // Look for an item in the specific rack/slot X/Y
            var itemToMove = await context.InventoryItems
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

            // We check if the item matches the barcode provided - if it doesn't throw an error at the user.
            // This acts as a safety check to ensure the operator picked up the correct item.
            if (itemToMove.Product.ScanCode != request.Barcode)
            {
                throw new InvalidOperationException($"Mismatch. Slot contains '{itemToMove.Product.Name}' ({itemToMove.Product.ScanCode}), but you scanned '{request.Barcode}'.");
            }

            // Find the target slot
            var targetRack = await context.Racks
                .Include(r => r.Slots)
                .ThenInclude(s => s.CurrentItem)
                .ThenInclude(i => i!.Product)
                .FirstOrDefaultAsync(r => r.Code == request.TargetRackCode);

            if (targetRack == null)
                throw new KeyNotFoundException($"Target rack {request.TargetRackCode} not found.");

            // Locate the specific coordinate in the target rack
            var targetSlot = targetRack.Slots.FirstOrDefault(s => s.X == request.TargetSlotX && s.Y == request.TargetSlotY);

            if (targetSlot == null)
                throw new KeyNotFoundException($"Target slot [{request.TargetSlotX},{request.TargetSlotY}] does not exist.");

            if (targetSlot.CurrentItem != null)
                throw new InvalidOperationException("Target slot is already occupied.");

            if (targetSlot.Status != RackSlotStatus.Available)
                throw new InvalidOperationException("Target slot is unavailable.");
                
            var product = itemToMove.Product;

            // Validation Block.
            // Since we are moving manually, we must re-validate all physical constraints 
            // that the Algorithm usually handles during Inbound.

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
            // We sum up existing items in the target rack + the new item.
            var currentLoad = targetRack.Slots
                .Where(s => s.CurrentItem != null)
                .Sum(s => s.CurrentItem!.Product.WeightKg);
                
            if (currentLoad + product.WeightKg > targetRack.MaxWeightKg)
            {
                throw new InvalidOperationException("Target rack weight limit exceeded.");
            }

            // Capture source rack ID before the move changes the entity
            var sourceRackId = itemToMove.Slot.Rack.Id;

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
            context.OperationLogs.Add(log);

            await context.SaveChangesAsync();
            await transaction.CommitAsync();

            logger.LogInformation($"Moved item {product.ScanCode} from {request.SourceRackCode} to {request.TargetRackCode}");

            // Trigger expiration check for both source (resolve) and target (create) racks
            await TriggerExpirationCheckAsync(sourceRackId);
            await TriggerExpirationCheckAsync(targetRack.Id);

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
            logger.LogError(ex, "Movement failed.");
            throw;
        }
    }

    /// <summary>
    /// Triggers an expiration check in a NEW DI scope so it gets its own DbContext,
    /// avoiding conflicts with the operation's already-committed transaction.
    /// </summary>
    private async Task TriggerExpirationCheckAsync(int rackId)
    {
        try
        {
            using var scope = serviceProvider.CreateScope();
            var monitoringService = scope.ServiceProvider.GetRequiredService<IMonitoringService>();
            await monitoringService.CheckExpirationDatesForRackAsync(rackId);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Post-operation expiration check failed for rack {RackId}. The operation itself succeeded.", rackId);
        }
    }

    public async Task<IEnumerable<OperationLogDto>> GetOperationHistoryAsync(int? limit = null)
    {
        logger.LogDebug("Fetching operation history with limit: {Limit}", limit ?? -1);
        var query = context.OperationLogs
            .Include(l => l.User)
            .OrderByDescending(l => l.Timestamp)
            .AsQueryable();

        if (limit.HasValue)
        {
            query = query.Take(limit.Value);
        }

        var logs = await query.ToListAsync();
        logger.LogDebug("Retrieved {Count} operation log entries", logs.Count);
        return logs.Select(l => new OperationLogDto
        {
            Id = l.Id,
            Timestamp = l.Timestamp,
            Type = l.Type.ToString(),
            UserName = l.User.Username,
            ProductDefinitionId = l.ProductDefinitionId,
            ProductName = l.ProductName,
            RackId = l.RackId,
            RackCode = l.RackCode,
            Description = l.Description
        });
    }
}
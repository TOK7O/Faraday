using Faraday.API.DTOs;
using Faraday.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Faraday.API.Controllers;

/// <summary>
/// API Controller handling physical warehouse operations.
/// Manages the lifecycle of inventory items: Receiving (Inbound), Shipping (Outbound), and Relocation (Move).
/// </summary>
[Route("api/[controller]")]
[ApiController]
[Authorize]
public class OperationController(
    IOperationService operationService,
    ILogger<OperationController> logger)
    : ControllerBase
{
    /// <summary>
    /// Helper method to extract the authenticated user's ID from JWT claims.
    /// </summary>
    private int GetCurrentUserId()
    {
        var idClaim = User.FindFirst("id");
        if (idClaim != null && int.TryParse(idClaim.Value, out int userId))
        {
            return userId;
        }
        throw new UnauthorizedAccessException("Invalid token: User ID missing.");
    }

    /// <summary>
    /// Processes an incoming item receipt (Inbound).
    /// Uses the allocation algorithm to automatically assign the best rack slot.
    /// </summary>
    [Authorize]
    [HttpPost("inbound")]
    public async Task<ActionResult<OperationResultDto>> Inbound(OperationInboundDto request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await operationService.ProcessInboundAsync(request, userId);
            logger.LogInformation("Inbound operation successful for barcode: {Barcode}, Rack: {RackCode}, Slot: [{SlotX},{SlotY}]", 
                request.Barcode, result.RackCode, result.SlotX, result.SlotY);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            logger.LogWarning("Inbound operation failed - product not found: {Barcode}", request.Barcode);
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            // This usually indicates that the warehouse is full or no suitable rack was found
            // for the product's constraints (temp/size), implying a logical conflict rather than a bad request.
            logger.LogWarning("Inbound operation failed - {Reason}", ex.Message);
            return Conflict(ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Inbound operation error for barcode: {Barcode}", request.Barcode);
            return StatusCode(500, $"Internal error: {ex.Message}");
        }
    }

    /// <summary>
    /// Processes an item shipment (Outbound).
    /// Applies FIFO logic to select the oldest available stock for the given barcode.
    /// </summary>
    [Authorize]
    [HttpPost("outbound")]
    public async Task<ActionResult<OperationResultDto>> Outbound(OperationOutboundDto request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await operationService.ProcessOutboundAsync(request, userId);
            logger.LogInformation("Outbound operation successful for barcode: {Barcode}, from Rack: {RackCode}, Slot: [{SlotX},{SlotY}]", 
                request.Barcode, result.RackCode, result.SlotX, result.SlotY);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            // In Outbound context, InvalidOperation usually means that there is no such item.
            // Therefore, 404 NotFound is the appropriate response code.
            logger.LogWarning("Outbound operation failed - {Reason}", ex.Message);
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Outbound operation error for barcode: {Barcode}", request.Barcode);
            return StatusCode(500, $"Internal error: {ex.Message}");
        }
    }

    /// <summary>
    /// Moves an item from one specific slot to another (Internal Movement).
    /// Validates that the target slot can physically accommodate the item.
    /// </summary>
    [Authorize]
    [HttpPost("move")]
    public async Task<ActionResult<OperationResultDto>> Move(OperationMovementDto request)
    {
        try
        {
            var userId = GetCurrentUserId();
            var result = await operationService.ProcessMovementAsync(request, userId);
            logger.LogInformation("Move operation successful for barcode: {Barcode}, from {SourceRack} to {TargetRack}", 
                request.Barcode, request.SourceRackCode, request.TargetRackCode);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            // Returns 404 if the Source/Target rack or slot coordinates do not exist.
            logger.LogWarning("Move operation failed - {Reason}", ex.Message);
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            // Returns 400 Bad Request if the move violates rules 
            // (e.g., target slot occupied, weight limit exceeded, temperature mismatch).
            logger.LogWarning("Move operation validation failed - {Reason}", ex.Message);
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Move operation error for barcode: {Barcode}", request.Barcode);
            return StatusCode(500, $"Internal error: {ex.Message}");
        }
    }

    /// <summary>
    /// Retrieves the operational history log.
    /// </summary>
    [HttpGet("history")]
    public async Task<ActionResult<IEnumerable<OperationLogDto>>> GetHistory([FromQuery] int? limit = null)
    {
        try
        {
            logger.LogInformation("Operation history requested with limit: {Limit}", limit ?? -1);
            var history = await operationService.GetOperationHistoryAsync(limit);
            return Ok(history);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal error: {ex.Message}");
        }
    }
}
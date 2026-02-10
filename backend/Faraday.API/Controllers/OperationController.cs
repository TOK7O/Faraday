using System.Security.Claims;
using Faraday.API.DTOs;
using Faraday.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Faraday.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class OperationController : ControllerBase
    {
        private readonly IOperationService _operationService;
        private readonly ILogger<OperationController> _logger;

        public OperationController(
            IOperationService operationService,
            ILogger<OperationController> logger)
        {
            _operationService = operationService;
            _logger = logger;
        }

        private int GetCurrentUserId()
        {
            var idClaim = User.FindFirst("id");
            if (idClaim != null && int.TryParse(idClaim.Value, out int userId))
            {
                return userId;
            }
            throw new UnauthorizedAccessException("Invalid token: User ID missing.");
        }

        [Authorize]
        [HttpPost("inbound")]
        public async Task<ActionResult<OperationResultDto>> Inbound(OperationInboundDto request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _operationService.ProcessInboundAsync(request, userId);
                _logger.LogInformation("Inbound operation successful for barcode: {Barcode}, Rack: {RackCode}, Slot: [{SlotX},{SlotY}]", 
                    request.Barcode, result.RackCode, result.SlotX, result.SlotY);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning("Inbound operation failed - product not found: {Barcode}", request.Barcode);
                return NotFound(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning("Inbound operation failed - {Reason}", ex.Message);
                return Conflict(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Inbound operation error for barcode: {Barcode}", request.Barcode);
                return StatusCode(500, $"Internal error: {ex.Message}");
            }
        }

        [Authorize]
        [HttpPost("outbound")]
        public async Task<ActionResult<OperationResultDto>> Outbound(OperationOutboundDto request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _operationService.ProcessOutboundAsync(request, userId);
                _logger.LogInformation("Outbound operation successful for barcode: {Barcode}, from Rack: {RackCode}, Slot: [{SlotX},{SlotY}]", 
                    request.Barcode, result.RackCode, result.SlotX, result.SlotY);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning("Outbound operation failed - {Reason}", ex.Message);
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Outbound operation error for barcode: {Barcode}", request.Barcode);
                return StatusCode(500, $"Internal error: {ex.Message}");
            }
        }

        [Authorize]
        [HttpPost("move")]
        public async Task<ActionResult<OperationResultDto>> Move(OperationMovementDto request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _operationService.ProcessMovementAsync(request, userId);
                _logger.LogInformation("Move operation successful for barcode: {Barcode}, from {SourceRack} to {TargetRack}", 
                    request.Barcode, request.SourceRackCode, request.TargetRackCode);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning("Move operation failed - {Reason}", ex.Message);
                return NotFound(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning("Move operation validation failed - {Reason}", ex.Message);
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Move operation error for barcode: {Barcode}", request.Barcode);
                return StatusCode(500, $"Internal error: {ex.Message}");
            }
        }

        [HttpGet("history")]
        public async Task<ActionResult<IEnumerable<OperationLogDto>>> GetHistory([FromQuery] int? limit = null)
        {
            try
            {
                _logger.LogInformation("Operation history requested with limit: {Limit}", limit ?? -1);
                var history = await _operationService.GetOperationHistoryAsync(limit);
                return Ok(history);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal error: {ex.Message}");
            }
        }
    }
}
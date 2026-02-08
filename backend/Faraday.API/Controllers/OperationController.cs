using System.Security.Claims;
using Faraday.API.DTOs;
using Faraday.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Faraday.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize]
    public class OperationController : ControllerBase
    {
        private readonly IOperationService _operationService;

        public OperationController(IOperationService operationService)
        {
            _operationService = operationService;
        }

        private int GetCurrentUserId()
        {
            try
            {
                var idClaim = User.FindFirst("id");
                if (idClaim != null && int.TryParse(idClaim.Value, out int userId))
                {
                    return userId;
                }
            }
            catch { }

            // Default user ID for non-authenticated access (e.g., when calling GetHistory without token)
            return 1;
        }

        [Authorize]
        [HttpPost("inbound")]
        public async Task<ActionResult<OperationResultDto>> Inbound(OperationInboundDto request)
        {
            try
            {
                var userId = GetCurrentUserId();
                var result = await _operationService.ProcessInboundAsync(request, userId);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ex.Message);
            }
            catch (Exception ex)
            {
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
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
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
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message); 
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal error: {ex.Message}");
            }
        }

        [HttpGet("history")]
        public async Task<ActionResult<IEnumerable<OperationLogDto>>> GetHistory([FromQuery] int? limit = null)
        {
            try
            {
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
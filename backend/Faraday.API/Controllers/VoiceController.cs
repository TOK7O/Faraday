using Faraday.API.DTOs;
using Faraday.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Faraday.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class VoiceController(IVoiceCommandService voiceCommandService, ILogger<VoiceController> logger)
    : ControllerBase
{
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

        return 1;
    }

    [HttpPost("command")]
    public async Task<ActionResult<VoiceCommandResponseDto>> ProcessVoiceCommand([FromBody] VoiceCommandRequestDto request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.CommandText))
            {
                return BadRequest(new VoiceCommandResponseDto
                {
                    Success = false,
                    Message = "Komenda nie może być pusta"
                });
            }

            var userId = GetCurrentUserId();
            logger.LogInformation("Voice command received from user {UserId}: {CommandText}", userId, request.CommandText);

            var result = await voiceCommandService.ProcessVoiceCommandAsync(request.CommandText, userId);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error processing voice command");
            return StatusCode(500, new VoiceCommandResponseDto
            {
                Success = false,
                Message = $"Błąd serwera: {ex.Message}"
            });
        }
    }
}
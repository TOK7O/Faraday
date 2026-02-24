using Faraday.API.DTOs;

namespace Faraday.API.Services.Interfaces;

public interface IVoiceCommandService
{
    Task<VoiceCommandResponseDto> ProcessVoiceCommandAsync(string commandText, int userId);
}
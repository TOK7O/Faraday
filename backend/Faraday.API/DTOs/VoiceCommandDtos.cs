using System.ComponentModel.DataAnnotations;

namespace Faraday.API.DTOs;

public class VoiceCommandRequestDto
{
    [Required]
    [MaxLength(1000)]
    public string CommandText { get; set; } = string.Empty;
}

public class VoiceCommandResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? ActionPerformed { get; set; }
    public object? Data { get; set; }
}
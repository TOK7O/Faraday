using System.ComponentModel.DataAnnotations;

namespace Faraday.API.DTOs
{
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

    public class CommandIntentDto
    {
        public string Action { get; set; } = string.Empty;
        public Dictionary<string, object> Parameters { get; set; } = new();
    }
    
    public class VoiceExecutionPlanDto
    {
        public List<VoiceExecutionStepDto> Steps { get; set; } = new();
        public string FinalResponseTemplate { get; set; } = string.Empty;
    }

    public class VoiceExecutionStepDto
    {
        public int StepNumber { get; set; }
        public string Method { get; set; } = string.Empty;
        public string Endpoint { get; set; } = string.Empty;
        public Dictionary<string, object> Parameters { get; set; } = new();
        public string? SaveResultAs { get; set; }
        public string Description { get; set; } = string.Empty; 
    }

    public class VoiceExecutionContextDto
    {
        public Dictionary<string, object> Variables { get; set; } = new();
        public List<string> ExecutionLog { get; set; } = new();
    }
}
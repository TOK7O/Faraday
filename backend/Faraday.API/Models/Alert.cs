using System.ComponentModel.DataAnnotations;

namespace Faraday.API.Models
{
    public enum AlertType
    {
        TemperatureMismatch, 
        WeightMismatch,      
        ExpirationWarning,
        ExpirationExpired
    }

    public class Alert
    {
        public int Id { get; set; }

        public int? RackId { get; set; } 
        public Rack? Rack { get; set; }

        [Required]
        public string Message { get; set; } = string.Empty;

        public AlertType Type { get; set; }

        public bool IsResolved { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ResolvedAt { get; set; }
        
    }
}
using System.ComponentModel.DataAnnotations;

namespace Faraday.API.Models
{
    public class TemperatureReading
    {
        public int Id { get; set; }

        public int RackId { get; set; }
        
        public Rack Rack { get; set; } = null!;

        [Required]
        public decimal RecordedTemperature { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
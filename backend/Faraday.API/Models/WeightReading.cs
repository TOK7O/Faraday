using System.ComponentModel.DataAnnotations;

namespace Faraday.API.Models
{
    public class WeightReading
    {
        public int Id { get; set; }

        public int RackId { get; set; }
        public Rack Rack { get; set; } = null!;

        [Required]
        public decimal MeasuredWeightKg { get; set; }

        [Required]
        public decimal ExpectedWeightKg { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
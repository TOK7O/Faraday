using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace Faraday.API.Models
{
    [Index(nameof(RackId), nameof(Timestamp))]
    public class TemperatureReading
    {
        [Key]
        public long Id { get; set; }

        public int RackId { get; set; }
        public virtual Rack Rack { get; set; } = null!;

        public decimal RecordedTemperature { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}

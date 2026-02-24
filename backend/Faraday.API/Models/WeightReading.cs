using System.ComponentModel.DataAnnotations;

namespace Faraday.API.Models;

public class WeightReading
{
    public int Id { get; init; }

    public int RackId { get; init; }
    public Rack Rack { get; init; } = null!;

    [Required]
    public decimal MeasuredWeightKg { get; init; }

    [Required]
    public decimal ExpectedWeightKg { get; init; }

    public DateTime Timestamp { get; init; } = DateTime.UtcNow;
}
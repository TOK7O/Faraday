using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace Faraday.API.Models;

[Index(nameof(Code), IsUnique = true)]
public class Rack : BaseEntity
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public required string Code { get; set; }

    [Range(1, 25)]
    public int Rows { get; set; }

    [Range(1, 25)]
    public int Columns { get; set; }

    public decimal MinTemperature { get; set; }
    public decimal MaxTemperature { get; set; }

    [Range(0, 100000)]
    public decimal MaxWeightKg { get; set; }

    [Range(0, 10000)]
    public decimal MaxItemWidthMm { get; set; }

    [Range(0, 10000)]
    public decimal MaxItemHeightMm { get; set; }

    [Range(0, 10000)]
    public decimal MaxItemDepthMm { get; set; }
        
    // Simulation Fields 

    // Temperature Monitoring
    public decimal? CurrentTemperature { get; set; }
    public DateTime? LastTemperatureCheck { get; set; }

    // Weight Monitoring (Total Rack Load)
    // Measured by sensors (simulated)
    public decimal? CurrentTotalWeightKg { get; set; } 
        
    // Calculated by the system
    public decimal? ExpectedTotalWeightKg { get; set; } 
        
    public DateTime? LastWeightCheck { get; set; }

    [MaxLength(500)]
    public string? Comment { get; set; }

    public bool IsActive { get; set; } = true;

    [Timestamp]
    public uint Version { get; set; }

    public virtual ICollection<RackSlot> Slots { get; set; } = new List<RackSlot>();
}
using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace Faraday.API.Models;

[Index(nameof(ScanCode), IsUnique = true)]
public class ProductDefinition : BaseEntity
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public required string ScanCode { get; set; }

    [Required]
    [MaxLength(200)]
    public required string Name { get; set; }

    [MaxLength(500)]
    public string? PhotoUrl { get; set; }

    public decimal RequiredMinTemp { get; set; }
    public decimal RequiredMaxTemp { get; set; }

    [Range(0, 10000)]
    public decimal WeightKg { get; set; }

    [Range(0, 5000)]
    public decimal WidthMm { get; set; }

    [Range(0, 5000)]
    public decimal HeightMm { get; set; }

    [Range(0, 5000)]
    public decimal DepthMm { get; set; }

    public bool IsHazardous { get; set; }
    public HazardType HazardClassification { get; set; }

    public uint? ValidityDays { get; set; }

    [MaxLength(1000)]
    public string? Comment { get; set; }

    public bool IsActive { get; set; } = true;
}
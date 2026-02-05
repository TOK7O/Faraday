using System.ComponentModel.DataAnnotations;
using Faraday.API.Models;

namespace Faraday.API.DTOs
{
    // DTO for creating (Input)
    public class ProductCreateDto
    {
        [Required]
        [MaxLength(100)]
        public string Barcode { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? PhotoUrl { get; set; }

        public decimal RequiredMinTemp { get; set; }
        public decimal RequiredMaxTemp { get; set; }

        public decimal WeightKg { get; set; }
        public decimal WidthMm { get; set; }
        public decimal HeightMm { get; set; }
        public decimal DepthMm { get; set; }

        public bool IsHazardous { get; set; }
        // CSV porvides only true/false, so we will set it to None/Other. 
        // In the API the correct hazard type can be set later, automatically it just sets to None or Other.
        public HazardType HazardClassification { get; set; } = HazardType.None;

        public uint? ValidityDays { get; set; }

        [MaxLength(1000)]
        public string? Comment { get; set; }
    }

    // DTO for reading (Output)
    public class ProductDto : ProductCreateDto
    {
        public int Id { get; set; }
        public bool IsActive { get; set; }
    }
}
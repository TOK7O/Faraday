using System.ComponentModel.DataAnnotations;

namespace Faraday.API.DTOs
{
    public class RackCreateDto
    {
        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        [Range(1, 1000)]
        public int Rows { get; set; } // M

        [Range(1, 1000)]
        public int Columns { get; set; } // N

        public decimal MinTemperature { get; set; }
        public decimal MaxTemperature { get; set; }

        public decimal MaxWeightKg { get; set; }
        public decimal MaxItemWidthMm { get; set; }
        public decimal MaxItemHeightMm { get; set; }
        public decimal MaxItemDepthMm { get; set; }

        [MaxLength(500)]
        public string? Comment { get; set; }
    }
    
    public class RackDto : RackCreateDto
    {
        public int Id { get; set; }
        public bool IsActive { get; set; }
        public int SlotCount { get; set; }
    }
    
    public class RackUpdateDto
    {
        public decimal MinTemperature { get; set; }
        public decimal MaxTemperature { get; set; }

        public decimal MaxWeightKg { get; set; }
        public decimal MaxItemWidthMm { get; set; }
        public decimal MaxItemHeightMm { get; set; }
        public decimal MaxItemDepthMm { get; set; }

        [MaxLength(500)]
        public string? Comment { get; set; }
    }
}
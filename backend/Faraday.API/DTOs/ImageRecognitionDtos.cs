using System.ComponentModel.DataAnnotations;

namespace Faraday.API.DTOs
{
    public class UploadReferenceImagesDto
    {
        [Required]
        public string ScanCode { get; set; } = string.Empty;
        
        [Required]
        public List<IFormFile> Images { get; set; } = new();
    }

    public class RecognizeProductDto
    {
        [Required]
        public IFormFile Image { get; set; } = null!;
    }

    public class RecognitionResultDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public ProductDto? Product { get; set; }
        public double ConfidenceScore { get; set; }
        public string ConfidenceLevel { get; set; } = string.Empty;
    }

    public class ProductImageDto
    {
        public int Id { get; set; }
        public int ProductDefinitionId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; }
        public string UploadedByUsername { get; set; } = string.Empty;
    }

    public class UploadResultDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public int UploadedCount { get; set; }
        public int FailedCount { get; set; }
        public List<string> Errors { get; set; } = new();
    }
}
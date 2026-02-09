using System.ComponentModel.DataAnnotations;

namespace Faraday.API.Models
{
    public class ProductImage : BaseEntity
    {
        [Key]
        public int Id { get; set; }

        public int ProductDefinitionId { get; set; }
        public virtual ProductDefinition Product { get; set; } = null!;

        [Required]
        [MaxLength(500)]
        public required string ImagePath { get; set; }

        // Feature vector extracted from the image (serialized as JSON array of floats)
        [Required]
        public required string FeatureVector { get; set; }

        public int UploadedByUserId { get; set; }
        public virtual User UploadedByUser { get; set; } = null!;
    }
}
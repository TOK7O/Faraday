using System.ComponentModel.DataAnnotations;

namespace Faraday.API.Models
{
    public class BackupLog
    {
        [Key]
        public int Id { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        [Required]
        [MaxLength(255)]
        public string FileName { get; set; } = string.Empty;

        public long SizeBytes { get; set; }

        public bool IsSuccessful { get; set; }

        public string? ErrorMessage { get; set; }

        public int? CreatedByUserId { get; set; }
        public virtual User? CreatedByUser { get; set; }
    }
}

using System.ComponentModel.DataAnnotations;

namespace Faraday.API.Models
{
    public class OperationLog
    {
        [Key]
        public long Id { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public OperationType Type { get; set; }

        public int UserId { get; set; }
        public virtual User User { get; set; } = null!;

        public int? ProductDefinitionId { get; set; }

        [MaxLength(200)]
        public string? ProductName { get; set; }

        public int? RackId { get; set; }

        [MaxLength(50)]
        public string? RackCode { get; set; }

        [MaxLength(2000)]
        public string Description { get; set; } = string.Empty;
    }
}

using System.ComponentModel.DataAnnotations;

namespace Faraday.API.DTOs
{
    public class OperationResultDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? RackCode { get; set; }
        public int? SlotX { get; set; }
        public int? SlotY { get; set; }
        public long OperationLogId { get; set; }
    }
    
    public class OperationInboundDto
    {
        [Required]
        public string Barcode { get; set; } = string.Empty;
    }
    
    public class OperationOutboundDto
    {
        [Required]
        public string Barcode { get; set; } = string.Empty;
    }
    
    public class OperationMovementDto
    {
        [Required]
        public string Barcode { get; set; } = string.Empty;
        
        [Required]
        public string SourceRackCode { get; set; } = string.Empty;
        
        [Range(1, 1000)]
        public int SourceSlotX { get; set; }
        
        [Range(1, 1000)]
        public int SourceSlotY { get; set; }

        [Required]
        public string TargetRackCode { get; set; } = string.Empty;

        [Range(1, 1000)]
        public int TargetSlotX { get; set; }

        [Range(1, 1000)]
        public int TargetSlotY { get; set; }
    }

    public class OperationLogDto
    {
        public long Id { get; set; }
        public DateTime Timestamp { get; set; }
        public string Type { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public int? ProductDefinitionId { get; set; }
        public string? ProductName { get; set; }
        public int? RackId { get; set; }
        public string? RackCode { get; set; }
        public string Description { get; set; } = string.Empty;
    }
}
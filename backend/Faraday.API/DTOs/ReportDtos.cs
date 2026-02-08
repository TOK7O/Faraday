namespace Faraday.API.DTOs
{
    public class DashboardStatsDto
    {
        public int TotalSlots { get; set; }
        public int OccupiedSlots { get; set; }
        public int FreeSlots { get; set; }
        public double OccupancyPercentage { get; set; }
        
        public decimal TotalWeightKg { get; set; }
        public decimal TotalCapacityKg { get; set; }
        public int ExpiringItemsCount { get; set; }
        public int OperationsToday { get; set; }
    }

    public class InventorySummaryDto
    {
        public string ProductName { get; set; } = string.Empty;
        public string Barcode { get; set; } = string.Empty;
        public int TotalQuantity { get; set; }
        public int BlockedQuantity { get; set; } // Quarantined/Damaged
        public DateTime? NextExpirationDate { get; set; }
    }

    public class ExpiringItemDto
    {
        public int Id { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string Barcode { get; set; } = string.Empty;
        public DateTime? ExpirationDate { get; set; }
        public int DaysRemaining { get; set; }
        public string LocationCode { get; set; } = string.Empty; // Format R-01 [1,1]
    }

    public class RackUtilizationDto
    {
        public string RackCode { get; set; } = string.Empty;
        
        public int TotalSlots { get; set; }
        public int OccupiedSlots { get; set; }
        public double SlotUtilizationPercentage { get; set; }

        public decimal MaxWeightKg { get; set; }
        public decimal CurrentWeightKg { get; set; }
        public double WeightUtilizationPercentage { get; set; }
    }
    
    public class TemperatureHistoryDto
    {
        public int Id { get; set; }
        public string RackCode { get; set; } = string.Empty;
        public decimal RecordedTemperature { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class WeightHistoryDto
    {
        public int Id { get; set; }
        public string RackCode { get; set; } = string.Empty;
        public decimal MeasuredWeightKg { get; set; }
        public decimal ExpectedWeightKg { get; set; }
        public decimal DiscrepancyKg { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class AlertHistoryDto
    {
        public int Id { get; set; }
        public string? RackCode { get; set; }
        public string Message { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public bool IsResolved { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
    }

    public class ActiveAlertDto
    {
        public int Id { get; set; }
        public string? RackCode { get; set; }
        public string Message { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public int DurationMinutes { get; set; }
    }
    
    public class RackTemperatureViolationDto
    {
        public int ReadingId { get; set; }
        public string RackCode { get; set; } = string.Empty;
        public decimal RecordedTemperature { get; set; }
        public decimal AllowedMinTemperature { get; set; }
        public decimal AllowedMaxTemperature { get; set; }
        public decimal ViolationDegrees { get; set; } // How much out of range
        public string ViolationType { get; set; } = string.Empty; // "TooHot" or "TooCold"
        public DateTime Timestamp { get; set; }
    }

    public class ItemTemperatureViolationDto
    {
        public int ItemId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string Barcode { get; set; } = string.Empty;
        public string RackCode { get; set; } = string.Empty;
        public int SlotX { get; set; }
        public int SlotY { get; set; }
        public decimal RecordedTemperature { get; set; }
        public decimal RequiredMinTemperature { get; set; }
        public decimal RequiredMaxTemperature { get; set; }
        public decimal ViolationDegrees { get; set; }
        public string ViolationType { get; set; } = string.Empty;
        public DateTime ViolationTimestamp { get; set; }
    }

    public class FullInventoryDto
    {
        public int ItemId { get; set; }
        
        // Product information
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string Barcode { get; set; } = string.Empty;
        public string? ProductPhotoUrl { get; set; }
        public decimal ProductWeightKg { get; set; }
        
        // Location information
        public string RackCode { get; set; } = string.Empty;
        public int SlotX { get; set; }
        public int SlotY { get; set; }
        public string LocationCode { get; set; } = string.Empty; // Format: "R-01 [1,2]"
        
        // Item status and dates
        public string Status { get; set; } = string.Empty;
        public DateTime EntryDate { get; set; }
        public DateTime? ExpirationDate { get; set; }
        public int? DaysUntilExpiration { get; set; }
        
        // Storage conditions
        public decimal CurrentRackTemperature { get; set; }
        public decimal RequiredMinTemp { get; set; }
        public decimal RequiredMaxTemp { get; set; }
        
        // User who received the item
        public string ReceivedByUsername { get; set; } = string.Empty;
        
        // Hazard information
        public bool IsHazardous { get; set; }
        public string? HazardClassification { get; set; }
    }
}
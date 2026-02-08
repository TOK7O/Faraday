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
}
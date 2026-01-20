using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace Faraday.Models
{
    [Flags]
    public enum HazardType
    {
        None = 0,
        Explosive = 1,
        Flammable = 2,
        SelfReactive = 4,
        Oxidizing = 8,
        Toxic = 16,
        Radioactive = 32,
        Corrosive = 64,
        Other = 128
    }

    public enum RackSlotStatus
    {
        Available,
        Maintenance,
        Damaged
    }

    public enum ItemStatus
    {
        InStock,
        Quarantined,
        Reserved,
        Damaged
    }

    public enum UserRole
    {
        Administrator,
        Manager,
        Supervisor,
        WarehouseWorker,
        Auditor
    }

    public enum OperationType
    {
        Inbound,
        Outbound,
        Adjustment,
        Movement,
        SystemBackup,
        SystemRestore
    }

    public abstract class BaseEntity
    {
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }

    [Index(nameof(Code), IsUnique = true)]
    public class Rack : BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public required string Code { get; set; }

        [Range(1, 1000)]
        public int Rows { get; set; }

        [Range(1, 1000)]
        public int Columns { get; set; }

        public decimal MinTemperature { get; set; }
        public decimal MaxTemperature { get; set; }

        [Range(0, 100000)]
        public decimal MaxWeightKg { get; set; }

        [Range(0, 10000)]
        public decimal MaxItemWidthMm { get; set; }

        [Range(0, 10000)]
        public decimal MaxItemHeightMm { get; set; }

        [Range(0, 10000)]
        public decimal MaxItemDepthMm { get; set; }

        [MaxLength(500)]
        public string? Comment { get; set; }

        public bool IsActive { get; set; } = true;

        [Timestamp]
        public uint Version { get; set; } 

        public virtual ICollection<RackSlot> Slots { get; set; } = new List<RackSlot>();
    }

    [Index(nameof(RackId), nameof(X), nameof(Y), IsUnique = true)]
    public class RackSlot
    {
        [Key]
        public int Id { get; set; }

        public int RackId { get; set; }
        public virtual Rack Rack { get; set; } = null!;

        [Range(0, 1000)]
        public int X { get; set; }

        [Range(0, 1000)]
        public int Y { get; set; }

        public RackSlotStatus Status { get; set; } = RackSlotStatus.Available;

        public virtual InventoryItem? CurrentItem { get; set; }
        
        public decimal? ExpectedWeightKg { get; set; }
        public decimal? LastMeasuredWeightKg { get; set; }
        public DateTime? LastWeightCheck { get; set; }

        [Timestamp]
        public uint Version { get; set; }
    }

    [Index(nameof(Barcode), IsUnique = true)]
    public class ProductDefinition : BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public required string Barcode { get; set; }

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

    public class InventoryItem : BaseEntity
    {
        [Key]
        public int Id { get; set; }

        public int ProductDefinitionId { get; set; }
        public virtual ProductDefinition Product { get; set; } = null!;

        public int RackSlotId { get; set; }
        public virtual RackSlot Slot { get; set; } = null!;

        public DateTime EntryDate { get; set; }
        public DateTime? ExpirationDate { get; set; }

        public ItemStatus Status { get; set; } = ItemStatus.InStock;

        public int ReceivedByUserId { get; set; }
        public virtual User ReceivedByUser { get; set; } = null!;

        [Timestamp]
        public uint Version { get; set; }
    }

    [Index(nameof(RackId), nameof(Timestamp))]
    public class TemperatureReading
    {
        [Key]
        public long Id { get; set; }

        public int RackId { get; set; }
        public virtual Rack Rack { get; set; } = null!;

        public decimal RecordedTemperature { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
    
    [Index(nameof(RackId), nameof(Timestamp))]
    public class WeightReading
    {
        [Key]
        public long Id { get; set; }

        public int RackId { get; set; }
        public virtual Rack Rack { get; set; } = null!;

        public decimal WeightKg { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }



    [Index(nameof(Username), IsUnique = true)]
    [Index(nameof(Email), IsUnique = true)]
    public class User : BaseEntity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public required string Username { get; set; }

        [Required]
        [EmailAddress]
        [MaxLength(100)]
        public required string Email { get; set; }

        [Required]
        public required string PasswordHash { get; set; }

        public UserRole Role { get; set; }

        [MaxLength(100)]
        public string? TwoFactorSecretKey { get; set; }

        public DateTime? LastLoginDate { get; set; }
        
        public bool IsActive { get; set; } = true;
    }

    public class OperationLog
    {
        [Key]
        public long Id { get; set; }
        
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public OperationType Type { get; set; }

        public int UserId { get; set; }
        public virtual User User { get; set; } = null!;

        public int? ProductDefinitionId { get; set; }
        public string? ProductName { get; set; } 

        public int? RackId { get; set; }
        public string? RackCode { get; set; } 

        [MaxLength(2000)]
        public string Description { get; set; } = string.Empty;
    }
}
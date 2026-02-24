using System.ComponentModel.DataAnnotations;

namespace Faraday.API.Models;

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
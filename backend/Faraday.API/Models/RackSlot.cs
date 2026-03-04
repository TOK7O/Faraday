using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace Faraday.API.Models;

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

    [Timestamp]
    public uint Version { get; set; }
}
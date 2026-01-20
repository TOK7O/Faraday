using Microsoft.EntityFrameworkCore;
using Faraday.Models;

namespace Faraday.Data
{
    public class FaradayDbContext : DbContext
    {
        public FaradayDbContext(DbContextOptions<FaradayDbContext> options) : base(options)
        {
        }

        public DbSet<Rack> Racks { get; set; }
        public DbSet<RackSlot> RackSlots { get; set; }
        public DbSet<ProductDefinition> Products { get; set; }
        public DbSet<InventoryItem> InventoryItems { get; set; }
        public DbSet<TemperatureReading> TemperatureReadings { get; set; }
        public DbSet<WeightReading> WeightReadings { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<OperationLog> OperationLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Rack>().HasQueryFilter(r => r.IsActive);
            modelBuilder.Entity<ProductDefinition>().HasQueryFilter(p => p.IsActive);
            modelBuilder.Entity<User>().HasQueryFilter(u => u.IsActive);

            var decimalProps = new[]
            {
                (typeof(Rack), nameof(Rack.MaxWeightKg)),
                (typeof(Rack), nameof(Rack.MinTemperature)),
                (typeof(Rack), nameof(Rack.MaxTemperature)),
                (typeof(Rack), nameof(Rack.MaxItemHeightMm)),
                (typeof(Rack), nameof(Rack.MaxItemWidthMm)),
                (typeof(Rack), nameof(Rack.MaxItemDepthMm)),
                
                (typeof(ProductDefinition), nameof(ProductDefinition.WeightKg)),
                (typeof(ProductDefinition), nameof(ProductDefinition.RequiredMinTemp)),
                (typeof(ProductDefinition), nameof(ProductDefinition.RequiredMaxTemp)),
                (typeof(ProductDefinition), nameof(ProductDefinition.WidthMm)),
                (typeof(ProductDefinition), nameof(ProductDefinition.HeightMm)),
                (typeof(ProductDefinition), nameof(ProductDefinition.DepthMm)),

                (typeof(TemperatureReading), nameof(TemperatureReading.RecordedTemperature))
            };

            foreach (var prop in decimalProps)
            {
                modelBuilder.Entity(prop.Item1)
                    .Property(prop.Item2)
                    .HasPrecision(18, 4);
            }

            modelBuilder.Entity<Rack>()
                .Property(r => r.Version)
                .IsRowVersion();
                
            modelBuilder.Entity<RackSlot>()
                .Property(r => r.Version)
                .IsRowVersion();
                
            modelBuilder.Entity<InventoryItem>()
                .Property(r => r.Version)
                .IsRowVersion();

            modelBuilder.Entity<InventoryItem>()
                .HasOne(i => i.Slot)
                .WithOne(s => s.CurrentItem)
                .HasForeignKey<InventoryItem>(i => i.RackSlotId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
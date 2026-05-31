using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Faraday.API.Data;
using Faraday.API.Models;
using Faraday.API.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Faraday.API.Tests
{
    public class WarehouseAlgorithmServiceTests : IDisposable
    {
        private readonly FaradayDbContext _context;
        private readonly WarehouseAlgorithmService _service;

        public WarehouseAlgorithmServiceTests()
        {
            var options = new DbContextOptionsBuilder<FaradayDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _context = new FaradayDbContext(options);
            var loggerMock = new Mock<ILogger<WarehouseAlgorithmService>>();
            _service = new WarehouseAlgorithmService(_context, loggerMock.Object);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }

        [Fact]
        public async Task FindBestSlotForProductAsync_ShouldReturnSlot_WhenRequirementsMet()
        {
            // Arrange
            var product = new ProductDefinition
            {
                Id = 1,
                ScanCode = "TEST001",
                Name = "Test Product",
                WidthMm = 100,
                HeightMm = 100,
                DepthMm = 100,
                RequiredMinTemp = 0,
                RequiredMaxTemp = 20,
                WeightKg = 10
            };
            _context.Products.Add(product);

            var rack = new Rack
            {
                Id = 1,
                Code = "A1",
                IsActive = true,
                MaxItemWidthMm = 200,
                MaxItemHeightMm = 200,
                MaxItemDepthMm = 200,
                MinTemperature = 5,
                MaxTemperature = 15,
                MaxWeightKg = 100,
                Slots = new List<RackSlot>
                {
                    new RackSlot { Id = 1, X = 1, Y = 1, Status = RackSlotStatus.Available, Items = new List<InventoryItem>() }
                }
            };
            _context.Racks.Add(rack);
            await _context.SaveChangesAsync();

            // Act
            var slot = await _service.FindBestSlotForProductAsync(1);

            // Assert
            slot.Should().NotBeNull();
            slot.Id.Should().Be(1);
        }

        [Fact]
        public async Task FindBestSlotForProductAsync_ShouldThrow_WhenProductIsTooBig()
        {
            // Arrange
            var product = new ProductDefinition
            {
                Id = 2,
                ScanCode = "TEST002",
                Name = "Big Product",
                WidthMm = 300, // Bigger than rack max
                HeightMm = 100,
                DepthMm = 100,
                RequiredMinTemp = 0,
                RequiredMaxTemp = 20,
                WeightKg = 10
            };
            _context.Products.Add(product);

            var rack = new Rack
            {
                Id = 2,
                Code = "A2",
                IsActive = true,
                MaxItemWidthMm = 200,
                MaxItemHeightMm = 200,
                MaxItemDepthMm = 200,
                MinTemperature = 5,
                MaxTemperature = 15,
                MaxWeightKg = 100,
                Slots = new List<RackSlot>
                {
                    new RackSlot { Id = 2, X = 1, Y = 1, Status = RackSlotStatus.Available, Items = new List<InventoryItem>() }
                }
            };
            _context.Racks.Add(rack);
            await _context.SaveChangesAsync();

            // Act & Assert
            var act = async () => await _service.FindBestSlotForProductAsync(2);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*No racks found meeting requirements*");
        }

        [Fact]
        public async Task FindBestSlotForProductAsync_ShouldThrow_WhenWeightLimitExceeded()
        {
            // Arrange
            var product = new ProductDefinition
            {
                Id = 3,
                ScanCode = "TEST003",
                Name = "Heavy Product",
                WidthMm = 100,
                HeightMm = 100,
                DepthMm = 100,
                RequiredMinTemp = 0,
                RequiredMaxTemp = 20,
                WeightKg = 60
            };
            _context.Products.Add(product);

            var rack = new Rack
            {
                Id = 3,
                Code = "A3",
                IsActive = true,
                MaxItemWidthMm = 200,
                MaxItemHeightMm = 200,
                MaxItemDepthMm = 200,
                MinTemperature = 5,
                MaxTemperature = 15,
                MaxWeightKg = 100, // Rack holds 100kg
                Slots = new List<RackSlot>
                {
                    new RackSlot 
                    { 
                        Id = 3, X = 1, Y = 1, Status = RackSlotStatus.Available, 
                        Items = new List<InventoryItem>
                        {
                            new InventoryItem { Id = 1, Product = product, ProductDefinitionId = 3 } // Already contains 60kg
                        } 
                    }
                }
            };
            _context.Racks.Add(rack);
            await _context.SaveChangesAsync();

            // Act & Assert
            // Adding another 60kg product would exceed 100kg limit
            var act = async () => await _service.FindBestSlotForProductAsync(3);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*No available slots found*");
        }
        
        [Fact]
        public async Task FindBestSlotForProductAsync_ShouldPreferStackingSameProduct()
        {
            // Arrange
            var product = new ProductDefinition
            {
                Id = 4,
                ScanCode = "TEST004",
                Name = "Stackable Product",
                WidthMm = 100,
                HeightMm = 100,
                DepthMm = 100,
                RequiredMinTemp = 0,
                RequiredMaxTemp = 20,
                WeightKg = 10
            };
            _context.Products.Add(product);

            var rack = new Rack
            {
                Id = 4,
                Code = "A4",
                IsActive = true,
                MaxItemWidthMm = 200,
                MaxItemHeightMm = 200,
                MaxItemDepthMm = 200,
                MinTemperature = 5,
                MaxTemperature = 15,
                MaxWeightKg = 100,
                Slots = new List<RackSlot>
                {
                    new RackSlot { Id = 4, X = 1, Y = 1, Status = RackSlotStatus.Available, Items = new List<InventoryItem>() },
                    new RackSlot 
                    { 
                        Id = 5, X = 2, Y = 1, Status = RackSlotStatus.Available, 
                        Items = new List<InventoryItem>
                        {
                            new InventoryItem { Id = 2, Product = product, ProductDefinitionId = 4 } 
                        } 
                    }
                }
            };
            _context.Racks.Add(rack);
            await _context.SaveChangesAsync();

            // Act
            var slot = await _service.FindBestSlotForProductAsync(4);

            // Assert
            // Should prefer slot 5 because it already has 1 item of the same product
            slot.Should().NotBeNull();
            slot.Id.Should().Be(5);
        }
    }
}

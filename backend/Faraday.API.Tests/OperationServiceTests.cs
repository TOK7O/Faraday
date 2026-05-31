using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Faraday.API.Data;
using Faraday.API.DTOs;
using Faraday.API.Models;
using Faraday.API.Services;
using Faraday.API.Services.Interfaces;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Faraday.API.Tests
{
    public class OperationServiceTests : IDisposable
    {
        private readonly FaradayDbContext _context;
        private readonly Mock<IWarehouseAlgorithmService> _algorithmMock;
        private readonly Mock<IServiceProvider> _serviceProviderMock;
        private readonly Mock<IPrinterService> _printerServiceMock;
        private readonly OperationService _service;

        public OperationServiceTests()
        {
            var options = new DbContextOptionsBuilder<FaradayDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .ConfigureWarnings(x => x.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            _context = new FaradayDbContext(options);
            
            _algorithmMock = new Mock<IWarehouseAlgorithmService>();
            _serviceProviderMock = new Mock<IServiceProvider>();
            _printerServiceMock = new Mock<IPrinterService>();
            
            var printerOptionsMock = Options.Create(new PrinterSettings());
            var loggerMock = new Mock<ILogger<OperationService>>();

            // Setup service provider for monitoring service (used in TriggerExpirationCheckAsync)
            var scopeMock = new Mock<Microsoft.Extensions.DependencyInjection.IServiceScope>();
            var scopeFactoryMock = new Mock<Microsoft.Extensions.DependencyInjection.IServiceScopeFactory>();
            var monitoringServiceMock = new Mock<IMonitoringService>();
            
            scopeMock.Setup(s => s.ServiceProvider.GetService(typeof(IMonitoringService)))
                     .Returns(monitoringServiceMock.Object);
            scopeFactoryMock.Setup(f => f.CreateScope()).Returns(scopeMock.Object);
            _serviceProviderMock.Setup(s => s.GetService(typeof(Microsoft.Extensions.DependencyInjection.IServiceScopeFactory)))
                                .Returns(scopeFactoryMock.Object);

            _service = new OperationService(
                _context,
                _algorithmMock.Object,
                _serviceProviderMock.Object,
                _printerServiceMock.Object,
                printerOptionsMock,
                loggerMock.Object
            );
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }

        [Fact]
        public async Task ProcessInboundAsync_ShouldReceiveStock_WhenValid()
        {
            // Arrange
            var product = new ProductDefinition { Id = 1, ScanCode = "12345", Name = "Test Product" };
            _context.Products.Add(product);
            
            var rack = new Rack { Id = 1, Code = "R1" };
            var targetSlot = new RackSlot { Id = 1, Rack = rack, X = 1, Y = 1, Items = new List<InventoryItem>() };
            _context.Racks.Add(rack);
            _context.RackSlots.Add(targetSlot);
            await _context.SaveChangesAsync();

            _algorithmMock.Setup(a => a.FindBestSlotForProductAsync(1))
                          .ReturnsAsync(targetSlot);

            var request = new OperationInboundDto { Barcode = "12345" };

            // Act
            var result = await _service.ProcessInboundAsync(request, userId: 1);

            // Assert
            result.Success.Should().BeTrue();
            result.RackCode.Should().Be("R1");
            result.SlotX.Should().Be(1);
            result.SlotY.Should().Be(1);
            
            var itemsInDb = await _context.InventoryItems.ToListAsync();
            itemsInDb.Should().ContainSingle();
            itemsInDb[0].ProductDefinitionId.Should().Be(1);
            itemsInDb[0].Status.Should().Be(ItemStatus.InStock);
        }

        [Fact]
        public async Task ProcessOutboundAsync_ShouldDispatchOldestStock_WhenMultipleExist()
        {
            // Arrange
            var product = new ProductDefinition { Id = 1, ScanCode = "12345", Name = "Test Product" };
            _context.Products.Add(product);
            
            var rack = new Rack { Id = 1, Code = "R1" };
            var slot1 = new RackSlot { Id = 1, Rack = rack, X = 1, Y = 1, Items = new List<InventoryItem>() };
            var slot2 = new RackSlot { Id = 2, Rack = rack, X = 2, Y = 1, Items = new List<InventoryItem>() };
            _context.Racks.Add(rack);
            _context.RackSlots.AddRange(slot1, slot2);

            var olderItem = new InventoryItem 
            { 
                Id = 1, ProductDefinitionId = 1, Product = product, 
                RackSlotId = 1, Slot = slot1, 
                EntryDate = DateTime.UtcNow.AddDays(-2), Status = ItemStatus.InStock,
                ZIndex = 0
            };
            var newerItem = new InventoryItem 
            { 
                Id = 2, ProductDefinitionId = 1, Product = product, 
                RackSlotId = 2, Slot = slot2, 
                EntryDate = DateTime.UtcNow.AddDays(-1), Status = ItemStatus.InStock,
                ZIndex = 0
            };
            
            slot1.Items.Add(olderItem);
            slot2.Items.Add(newerItem);
            _context.InventoryItems.AddRange(olderItem, newerItem);
            await _context.SaveChangesAsync();

            var request = new OperationOutboundDto { Barcode = "12345" };

            // Act
            var result = await _service.ProcessOutboundAsync(request, userId: 1);

            // Assert
            result.Success.Should().BeTrue();
            result.SlotX.Should().Be(1); // Should dispatch from slot 1 (older item)
            
            var remainingItems = await _context.InventoryItems.ToListAsync();
            remainingItems.Should().ContainSingle();
            remainingItems[0].Id.Should().Be(2); // Newer item should remain
        }
        
        [Fact]
        public async Task ProcessInboundAsync_ShouldThrow_WhenProductNotFound()
        {
            // Arrange
            var request = new OperationInboundDto { Barcode = "UNKNOWN" };

            // Act & Assert
            var act = async () => await _service.ProcessInboundAsync(request, userId: 1);
            await act.Should().ThrowAsync<KeyNotFoundException>()
                     .WithMessage("*not found*");
        }
    }
}

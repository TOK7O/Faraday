using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Faraday.API.Data;
using Faraday.API.DTOs;
using Faraday.API.Models;
using Faraday.API.Services.Interfaces;
using CsvHelper;
using CsvHelper.Configuration;

namespace Faraday.API.Services
{
    public class ProductService : IProductService
    {
        private readonly FaradayDbContext _context;
        private readonly ILogger<ProductService> _logger;

        public ProductService(FaradayDbContext context, ILogger<ProductService> logger)
        {
            _context = context;
            _logger = logger;
        }

        private static ProductDto MapToDto(ProductDefinition p)
        {
            return new ProductDto
            {
                Id = p.Id,
                ScanCode = p.ScanCode,
                Name = p.Name,
                PhotoUrl = p.PhotoUrl,
                RequiredMinTemp = p.RequiredMinTemp,
                RequiredMaxTemp = p.RequiredMaxTemp,
                WeightKg = p.WeightKg,
                WidthMm = p.WidthMm,
                HeightMm = p.HeightMm,
                DepthMm = p.DepthMm,
                IsHazardous = p.IsHazardous,
                HazardClassification = p.HazardClassification,
                ValidityDays = p.ValidityDays,
                Comment = p.Comment,
                IsActive = p.IsActive
            };
        }

        public async Task<IEnumerable<ProductDto>> GetAllProductsAsync()
        {
            var products = await _context.Products
                .OrderBy(p => p.Name)
                .ToListAsync();
            return products.Select(MapToDto);
        }

        public async Task<ProductDto?> GetProductByIdAsync(int id)
        {
            var product = await _context.Products.FindAsync(id);
            return product == null ? null : MapToDto(product);
        }

        public async Task<ProductDto?> GetProductByScanCodeAsync(string scanCode)
        {
            var product = await _context.Products.FirstOrDefaultAsync(p => p.ScanCode == scanCode);
            return product == null ? null : MapToDto(product);
        }

        public async Task<ProductDto> CreateProductAsync(ProductCreateDto dto)
        {
            if (await _context.Products.AnyAsync(p => p.ScanCode == dto.ScanCode))
            {
                throw new InvalidOperationException($"Product with scanCode {dto.ScanCode} already exists.");
            }

            var product = new ProductDefinition
            {
                ScanCode = dto.ScanCode,
                Name = dto.Name,
                PhotoUrl = dto.PhotoUrl,
                RequiredMinTemp = dto.RequiredMinTemp,
                RequiredMaxTemp = dto.RequiredMaxTemp,
                WeightKg = dto.WeightKg,
                WidthMm = dto.WidthMm,
                HeightMm = dto.HeightMm,
                DepthMm = dto.DepthMm,
                IsHazardous = dto.IsHazardous,
                HazardClassification = dto.HazardClassification, // Default from DTO
                ValidityDays = dto.ValidityDays,
                Comment = dto.Comment,
                IsActive = true
            };

            // Compliance logic: if IsHazardous=true, and HazardClassification is set to None, Other is set.
            if (product.IsHazardous && product.HazardClassification == HazardType.None)
            {
                product.HazardClassification = HazardType.Other;
            }

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Created product definition: {product.Name} ({product.ScanCode})");
            return MapToDto(product);
        }
        
        public async Task<ProductDto> UpdateProductAsync(int id, ProductUpdateDto dto)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null)
            {
                throw new KeyNotFoundException($"Product with ID {id} not found.");
            }

            // Retrieve all active inventory items of this product to validate against their racks
            var itemsInStock = await _context.InventoryItems
                .Include(i => i.Slot)
                .ThenInclude(s => s.Rack)
                .Where(i => i.ProductDefinitionId == id && i.Status == ItemStatus.InStock)
                .ToListAsync();

            // If there are items in stock, validate that new specifications are compatible with their racks
            if (itemsInStock.Any())
            {
                foreach (var item in itemsInStock)
                {
                    var rack = item.Slot.Rack;

                    // Temperature validation - rack must be able to maintain new product requirements
                    if (rack.MinTemperature > dto.RequiredMinTemp || 
                        rack.MaxTemperature < dto.RequiredMaxTemp)
                    {
                        throw new InvalidOperationException(
                            $"Cannot update product: Item in rack '{rack.Code}' requires " +
                            $"temperature range {dto.RequiredMinTemp}°C - {dto.RequiredMaxTemp}°C, " +
                            $"but rack only supports {rack.MinTemperature}°C - {rack.MaxTemperature}°C");
                    }

                    // Dimension validation - new size must fit in current rack slots
                    if (dto.WidthMm > rack.MaxItemWidthMm || 
                        dto.HeightMm > rack.MaxItemHeightMm || 
                        dto.DepthMm > rack.MaxItemDepthMm)
                    {
                        throw new InvalidOperationException(
                            $"Cannot update product: New dimensions {dto.WidthMm}x{dto.HeightMm}x{dto.DepthMm}mm " +
                            $"exceed rack '{rack.Code}' limits {rack.MaxItemWidthMm}x{rack.MaxItemHeightMm}x{rack.MaxItemDepthMm}mm");
                    }

                    // Weight validation - rack must handle new weight without exceeding total capacity
                    var otherItemsWeight = rack.Slots
                        .Where(s => s.CurrentItem != null && s.CurrentItem.Id != item.Id)
                        .Sum(s => s.CurrentItem!.Product.WeightKg);
                    
                    var newTotalWeight = otherItemsWeight + dto.WeightKg;

                    if (newTotalWeight > rack.MaxWeightKg)
                    {
                        throw new InvalidOperationException(
                            $"Cannot update product: New weight {dto.WeightKg}kg would cause rack '{rack.Code}' " +
                            $"to exceed its limit (total: {newTotalWeight:F2}kg / {rack.MaxWeightKg}kg)");
                    }
                }
            }

            // Compliance validation - hazardous products must have classification
            if (dto.IsHazardous && dto.HazardClassification == HazardType.None)
            {
                dto.HazardClassification = HazardType.Other;
            }

            // Apply updates to the product definition
            product.Name = dto.Name;
            product.PhotoUrl = dto.PhotoUrl;
            product.RequiredMinTemp = dto.RequiredMinTemp;
            product.RequiredMaxTemp = dto.RequiredMaxTemp;
            product.WeightKg = dto.WeightKg;
            product.WidthMm = dto.WidthMm;
            product.HeightMm = dto.HeightMm;
            product.DepthMm = dto.DepthMm;
            product.IsHazardous = dto.IsHazardous;
            product.HazardClassification = dto.HazardClassification;
            product.ValidityDays = dto.ValidityDays;
            product.Comment = dto.Comment;
            product.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation($"Updated product definition: {product.Name} (ID: {id})");
            return MapToDto(product);
        }
        
        public async Task DeleteProductAsync(int id)
        {
            // Check if there are any active items of this product in stock
            bool hasActiveStock = await _context.InventoryItems
                .AnyAsync(i => i.Product.Id == id && i.Status == ItemStatus.InStock);

            if (hasActiveStock)
            {
                // Retrieve name only for the error message
                var productName = await _context.Products
                    .Where(p => p.Id == id)
                    .Select(p => p.Name)
                    .FirstOrDefaultAsync() ?? "Unknown";

                throw new InvalidOperationException(
                    $"Cannot delete product '{productName}' because there are items currently in stock. " +
                    "Please release items of this type first.");
            }

            var product = await _context.Products.FindAsync(id);
            if (product != null)
            {
                // Soft delete
                product.IsActive = false;

                // Rename ScanCode to avoid Unique Constraint violation on re-import
                string originalScanCode = product.ScanCode;
                string newScanCode = $"ARCHIVED: {originalScanCode}";
                int counter = 1;

                // Check loop to find a free archived name
                while (await _context.Products.IgnoreQueryFilters().AnyAsync(p => p.ScanCode == newScanCode))
                {
                    newScanCode = $"ARCHIVED_{counter}: {originalScanCode}";
                    counter++;
                }

                product.ScanCode = newScanCode;
                
                // Rename the visible name too
                product.Name = $"ARCHIVED: {product.Name}";

                await _context.SaveChangesAsync();
                _logger.LogInformation($"Product {id} soft-deleted. Code changed to '{newScanCode}'.");
            }
        }
        
        public async Task<(int successCount, int errorCount, List<string> errors)> ImportProductsFromCsvAsync(Stream fileStream)
        {
            var errors = new List<string>();
            var validDtos = new List<ProductCreateDto>();
            int successCount = 0;
            int errorCount = 0;

            using var reader = new StreamReader(fileStream);
            
            var config = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                Delimiter = ";",
                Comment = '#',
                AllowComments = true,
                HasHeaderRecord = false, // # serves as a header, so we skip this
                MissingFieldFound = null
            };

            using var csv = new CsvReader(reader, config);
            
            csv.Context.RegisterClassMap<ProductImportMap>();

            int lineNumber = 0;

            // Read all valid records into memory
            while (await csv.ReadAsync())
            {
                lineNumber++;
                try
                {
                    var dto = csv.GetRecord<ProductCreateDto>();

                    // If a product is marked as hazardous but has no specific type, default to 'Other'.
                    if (dto.IsHazardous && dto.HazardClassification == HazardType.None)
                    {
                        dto.HazardClassification = HazardType.Other;
                    }
                    
                    validDtos.Add(dto);
                }
                catch (Exception ex)
                {
                    errors.Add($"Row {lineNumber}: {ex.Message}");
                    errorCount++;
                }
            }

            if (!validDtos.Any())
            {
                return (0, errorCount, errors);
            }

            // Bulk duplicate validation
            // We need to check duplicates within the file itself and against the database.
            // Remove duplicates within the file based on ScanCode
            var distinctDtos = validDtos.DistinctBy(d => d.ScanCode).ToList();
            if (distinctDtos.Count < validDtos.Count)
            {
                var removedCount = validDtos.Count - distinctDtos.Count;
                errors.Add($"Skipped {removedCount} duplicate product(s) found within the CSV file.");
                errorCount += removedCount;
            }

            // Check against database
            var newScanCodes = distinctDtos.Select(d => d.ScanCode).ToList();
            var existingScanCodes = await _context.Products
                .Where(p => newScanCodes.Contains(p.ScanCode))
                .Select(p => p.ScanCode)
                .ToListAsync();

            var productsToAdd = new List<ProductDefinition>();

            foreach (var dto in distinctDtos)
            {
                if (existingScanCodes.Contains(dto.ScanCode))
                {
                    errors.Add($"Product with ScanCode '{dto.ScanCode}' already exists in the database. Skipped.");
                    errorCount++;
                    continue;
                }

                // Map DTO to Entity
                var product = new ProductDefinition
                {
                    ScanCode = dto.ScanCode,
                    Name = dto.Name,
                    PhotoUrl = dto.PhotoUrl,
                    RequiredMinTemp = dto.RequiredMinTemp,
                    RequiredMaxTemp = dto.RequiredMaxTemp,
                    WeightKg = dto.WeightKg,
                    WidthMm = dto.WidthMm,
                    HeightMm = dto.HeightMm,
                    DepthMm = dto.DepthMm,
                    IsHazardous = dto.IsHazardous,
                    HazardClassification = dto.HazardClassification,
                    ValidityDays = dto.ValidityDays,
                    Comment = dto.Comment,
                    IsActive = true
                };

                productsToAdd.Add(product);
            }

            // Bulk Insert
            if (productsToAdd.Any())
            {
                await _context.Products.AddRangeAsync(productsToAdd);
                await _context.SaveChangesAsync();
                
                successCount += productsToAdd.Count;
                _logger.LogInformation($"Imported {productsToAdd.Count} products from CSV.");
            }

            return (successCount, errorCount, errors);
        }
        
        private sealed class ProductImportMap : ClassMap<ProductCreateDto>
        {
            public ProductImportMap()
            {
                Map(m => m.Name).Index(0);
                Map(m => m.ScanCode).Index(1);
                Map(m => m.PhotoUrl).Index(2);
                Map(m => m.RequiredMinTemp).Index(3);
                Map(m => m.RequiredMaxTemp).Index(4);
                Map(m => m.WeightKg).Index(5);
                Map(m => m.WidthMm).Index(6);
                Map(m => m.HeightMm).Index(7);
                Map(m => m.DepthMm).Index(8);
                Map(m => m.Comment).Index(9);
                
                // Automatically handles nullable uint parsing
                Map(m => m.ValidityDays).Index(10);
                
                // Handles boolean text values like "TRUE", "FALSE", "True", "False"
                Map(m => m.IsHazardous).Index(11)
                    .TypeConverterOption.BooleanValues(true, true, "TRUE", "True", "true")
                    .TypeConverterOption.BooleanValues(false, true, "FALSE", "False", "false");

                // HazardClassification is not present in the CSV, so we ignore it during mapping
                Map(m => m.HazardClassification).Ignore();
            }
        }        
    }
}
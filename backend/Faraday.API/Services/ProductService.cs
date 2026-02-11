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
    /// <summary>
    /// Manages the catalog of product definitions.
    /// Handles creation, updates with physical validation against active inventory, 
    /// soft-deletion logic, and bulk CSV imports.
    /// </summary>
    public class ProductService(FaradayDbContext context, ILogger<ProductService> logger) : IProductService
    {
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
            logger.LogInformation("Retrieving all products from database");
            var products = await context.Products
                .OrderBy(p => p.Name)
                .ToListAsync();
            return products.Select(MapToDto);
        }

        public async Task<ProductDto?> GetProductByIdAsync(int id)
        {
            logger.LogInformation("Fetching product by ID: {ProductId}", id);
            var product = await context.Products.FindAsync(id);
    
            if (product == null)
            {
                logger.LogWarning("Product not found: {ProductId}", id);
            }
    
            return product == null ? null : MapToDto(product);
        }
        public async Task<ProductDto?> GetProductByScanCodeAsync(string scanCode)
        {
            logger.LogInformation("Fetching product by scan code: {ScanCode}", scanCode);
            var product = await context.Products.FirstOrDefaultAsync(p => p.ScanCode == scanCode);
    
            if (product == null)
            {
                logger.LogWarning("Product not found for scan code: {ScanCode}", scanCode);
            }
    
            return product == null ? null : MapToDto(product);
        }

        public async Task<ProductDto> CreateProductAsync(ProductCreateDto dto)
        {
            // Enforce uniqueness on ScanCode/Barcode to prevent collisions.
            if (await context.Products.AnyAsync(p => p.ScanCode == dto.ScanCode))
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
                HazardClassification = dto.HazardClassification, 
                ValidityDays = dto.ValidityDays,
                Comment = dto.Comment,
                IsActive = true
            };

            // Compliance logic: if IsHazardous=true, and HazardClassification is set to None, Other is set.
            // This ensures we don't have dangerous items floating around without a classification tag.
            if (product is { IsHazardous: true, HazardClassification: HazardType.None })
            {
                product.HazardClassification = HazardType.Other;
            }

            context.Products.Add(product);
            await context.SaveChangesAsync();

            logger.LogInformation($"Created product definition: {product.Name} ({product.ScanCode})");
            return MapToDto(product);
        }
        
        /// <summary>
        /// Updates an existing product definition.
        /// Performs critical validation to ensure that changing physical properties (Weight, Dim, Temp)
        /// does not violate the constraints of racks where this product is currently stored.
        /// </summary>
        public async Task<ProductDto> UpdateProductAsync(int id, ProductUpdateDto dto)
        {
            var product = await context.Products.FindAsync(id);
            if (product == null)
            {
                throw new KeyNotFoundException($"Product with ID {id} not found.");
            }

            // Retrieve all active inventory items of this product to validate against their racks
            // We need to check every single instance of this product in the warehouse.
            var itemsInStock = await context.InventoryItems
                .Include(i => i.Slot)
                .ThenInclude(s => s.Rack).ThenInclude(rack => rack.Slots).ThenInclude(rackSlot => rackSlot.CurrentItem!)
                .ThenInclude(inventoryItem => inventoryItem.Product)
                .Where(i => i.ProductDefinitionId == id && i.Status == ItemStatus.InStock)
                .ToListAsync();

            // If there are items in stock, validate that new specifications are compatible with their racks
            if (itemsInStock.Any())
            {
                foreach (var item in itemsInStock)
                {
                    var rack = item.Slot.Rack;

                    // Temperature validation - rack must be able to maintain new product requirements
                    // The rack's range must be a subset of the product's temperature range.
                    // Example: If a product needs 2-8°C, a rack operating at 0-10°C is invalid.
                    if (rack.MinTemperature < dto.RequiredMinTemp || 
                        rack.MaxTemperature > dto.RequiredMaxTemp)
                    {
                        throw new InvalidOperationException(
                            $"Cannot update product: Rack '{rack.Code}' operates in range {rack.MinTemperature}°C - {rack.MaxTemperature}°C, " +
                            $"which exceeds the product safe range of {dto.RequiredMinTemp}°C - {dto.RequiredMaxTemp}°C");
                    }

                    // Dimension validation - a new size must fit in current rack slots
                    // Prevents defining a product as larger than the physical slot it currently occupies.
                    if (dto.WidthMm > rack.MaxItemWidthMm || 
                        dto.HeightMm > rack.MaxItemHeightMm || 
                        dto.DepthMm > rack.MaxItemDepthMm)
                    {
                        throw new InvalidOperationException(
                            $"Cannot update product: New dimensions {dto.WidthMm}x{dto.HeightMm}x{dto.DepthMm}mm " +
                            $"exceed rack '{rack.Code}' limits {rack.MaxItemWidthMm}x{rack.MaxItemHeightMm}x{rack.MaxItemDepthMm}mm");
                    }

                    // Weight validation - rack must handle new weight without exceeding total capacity
                    // We recalculate the total rack weight
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

            // Hazardous products must have classification
            if (dto is { IsHazardous: true, HazardClassification: HazardType.None })
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

            await context.SaveChangesAsync();

            logger.LogInformation($"Updated product definition: {product.Name} (ID: {id})");
            return MapToDto(product);
        }
        
        /// <summary>
        /// Performs a soft delete on a product.
        /// Renames the ScanCode to allow re-using the original barcode for a new product later.
        /// </summary>
        public async Task DeleteProductAsync(int id)
        {
            // Check if there are any active items of this product in stock
            // We cannot delete a definition if physical items still exist in the warehouse.
            bool hasActiveStock = await context.InventoryItems
                .AnyAsync(i => i.Product.Id == id && i.Status == ItemStatus.InStock);

            if (hasActiveStock)
            {
                // Retrieve name only for the error message
                var productName = await context.Products
                    .Where(p => p.Id == id)
                    .Select(p => p.Name)
                    .FirstOrDefaultAsync() ?? "Unknown";

                throw new InvalidOperationException(
                    $"Cannot delete product '{productName}' because there are items currently in stock. " +
                    "Please release items of this type first.");
            }

            var product = await context.Products.FindAsync(id);
            if (product != null)
            {
                // Softly delete
                product.IsActive = false;

                // Rename ScanCode to avoid Unique Constraint violation on re-import
                // If we didn't do this, we couldn't create a new product with the same barcode later.
                string originalScanCode = product.ScanCode;
                string newScanCode = $"ARCHIVED: {originalScanCode}";
                int counter = 1;

                // Check loop to find a free archived name
                while (await context.Products.IgnoreQueryFilters().AnyAsync(p => p.ScanCode == newScanCode))
                {
                    newScanCode = $"ARCHIVED_{counter}: {originalScanCode}";
                    counter++;
                }

                product.ScanCode = newScanCode;
                
                // Rename the visible name too
                product.Name = $"ARCHIVED: {product.Name}";

                await context.SaveChangesAsync();
                logger.LogInformation($"Product {id} soft-deleted. Code changed to '{newScanCode}'.");
            }
        }
        
        /// <summary>
        /// Reads a CSV stream and imports products.
        /// Handles duplicate detection both within the file and against existing database records.
        /// </summary>
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
                HasHeaderRecord = false,
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
                    if (dto is { IsHazardous: true, HazardClassification: HazardType.None })
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

            // Check against the database to avoid Unique Constraint violations
            var newScanCodes = distinctDtos.Select(d => d.ScanCode).ToList();
            var existingScanCodes = await context.Products
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
                await context.Products.AddRangeAsync(productsToAdd);
                await context.SaveChangesAsync();
                
                successCount += productsToAdd.Count;
                logger.LogInformation("Bulk imported {Count} products from CSV. Success: {Success}, Errors: {Errors}", 
                    productsToAdd.Count, successCount, errorCount);
            }
            else
            {
                logger.LogWarning("No products were imported. Total errors: {ErrorCount}", errorCount);
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
                
                Map(m => m.ValidityDays).Index(10);
                
                // Handles boolean text values like "TRUE", "FALSE", "True", "False"
                // Essential for CSVs generated by different locales or software.
                Map(m => m.IsHazardous).Index(11)
                    .TypeConverterOption.BooleanValues(true, true, "TRUE", "True", "true")
                    .TypeConverterOption.BooleanValues(false, true, "FALSE", "False", "false");

                // HazardClassification is not present in the CSV (as it's an additional feature
                // that we implemented, so we ignore it during mapping
                Map(m => m.HazardClassification).Ignore();
            }
        }        
    }
}
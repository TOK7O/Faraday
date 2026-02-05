using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Faraday.API.Data;
using Faraday.API.DTOs;
using Faraday.API.Models;
using Faraday.API.Services.Interfaces;

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
                Barcode = p.Barcode,
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

        public async Task<ProductDto?> GetProductByBarcodeAsync(string barcode)
        {
            var product = await _context.Products.FirstOrDefaultAsync(p => p.Barcode == barcode);
            return product == null ? null : MapToDto(product);
        }

        public async Task<ProductDto> CreateProductAsync(ProductCreateDto dto)
        {
            if (await _context.Products.AnyAsync(p => p.Barcode == dto.Barcode))
            {
                throw new InvalidOperationException($"Product with barcode {dto.Barcode} already exists.");
            }

            var product = new ProductDefinition
            {
                Barcode = dto.Barcode,
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

            _logger.LogInformation($"Created product definition: {product.Name} ({product.Barcode})");
            return MapToDto(product);
        }

        public async Task DeleteProductAsync(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product != null)
            {
                product.IsActive = false;
                await _context.SaveChangesAsync();
            }
        }

        public async Task<(int successCount, int errorCount, List<string> errors)> ImportProductsFromCsvAsync(Stream fileStream)
        {
            var errors = new List<string>();
            int successCount = 0;
            int errorCount = 0;

            using var reader = new StreamReader(fileStream);
            int lineNumber = 0;
            string? line;
            
            while ((line = await reader.ReadLineAsync()) != null)
            {
                lineNumber++;

                if (string.IsNullOrWhiteSpace(line)) continue;
                
                // Ignore comments starting with '#'
                if (line.TrimStart().StartsWith("#")) continue;

                var parts = line.Split(';');
                
                // Expected format per requirements (12 columns)
                if (parts.Length < 12)
                {
                    errors.Add($"Line {lineNumber}: Invalid format. Expected at least 12 columns.");
                    errorCount++;
                    continue;
                }

                try
                {
                    // Parse boolean values (TRUE/FALSE)
                    bool isHazardous = bool.TryParse(parts[11].Trim(), out var haz) && haz;

                    var dto = new ProductCreateDto
                    {
                        Name = parts[0].Trim(),
                        Barcode = parts[1].Trim(),
                        PhotoUrl = parts[2].Trim(),
                        RequiredMinTemp = decimal.Parse(parts[3], CultureInfo.InvariantCulture),
                        RequiredMaxTemp = decimal.Parse(parts[4], CultureInfo.InvariantCulture),
                        WeightKg = decimal.Parse(parts[5], CultureInfo.InvariantCulture),
                        WidthMm = decimal.Parse(parts[6], CultureInfo.InvariantCulture),
                        HeightMm = decimal.Parse(parts[7], CultureInfo.InvariantCulture),
                        DepthMm = decimal.Parse(parts[8], CultureInfo.InvariantCulture),
                        Comment = parts[9].Trim(),
                        ValidityDays = uint.TryParse(parts[10], out var days) ? days : null,
                        IsHazardous = isHazardous,
                        // If strictly hazardous but no specific type provided in CSV, default to Other
                        HazardClassification = isHazardous ? HazardType.Other : HazardType.None
                    };

                    await CreateProductAsync(dto);
                    successCount++;
                }
                catch (Exception ex)
                {
                    errors.Add($"Line {lineNumber}: {ex.Message}");
                    errorCount++;
                }
            }

            return (successCount, errorCount, errors);
        }
    }
}
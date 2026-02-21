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
    /// Manages the physical storage infrastructure (Racks) of the warehouse.
    /// Handles the lifecycle of Racks, including automatic slot generation, 
    /// capacity validation, and bulk import operations.
    /// </summary>
    public class RackService(FaradayDbContext context, ILogger<RackService> logger) : IRackService
    {
        // Mapping Entity -> DTO
        private static RackDto MapToDto(Rack rack)
        {
            return new RackDto
            {
                Id = rack.Id,
                Code = rack.Code,
                Rows = rack.Rows,
                Columns = rack.Columns,
                MinTemperature = rack.MinTemperature,
                MaxTemperature = rack.MaxTemperature,
                MaxWeightKg = rack.MaxWeightKg,
                MaxItemWidthMm = rack.MaxItemWidthMm,
                MaxItemHeightMm = rack.MaxItemHeightMm,
                MaxItemDepthMm = rack.MaxItemDepthMm,
                Comment = rack.Comment,
                IsActive = rack.IsActive,
                SlotCount = rack.Slots.Count 
            };
        }

        public async Task<IEnumerable<RackDto>> GetAllRacksAsync()
        {
            logger.LogInformation("Retrieving all racks from database");
            var racks = await context.Racks
                .Include(r => r.Slots)
                .OrderBy(r => r.Code)
                .ToListAsync();

            return racks.Select(MapToDto);
        }

        public async Task<RackDto?> GetRackByIdAsync(int id)
        {
            logger.LogInformation("Fetching rack by ID: {RackId}", id);
            var rack = await context.Racks
                .Include(r => r.Slots)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (rack == null)
            {
                logger.LogWarning("Rack not found: {RackId}", id);
            }

            return rack == null ? null : MapToDto(rack);
        }

        /// <summary>
        /// Creates a new Rack definition and automatically generates the grid of storage slots.
        /// </summary>
        public async Task<RackDto> CreateRackAsync(RackCreateDto dto)
        {
            if (await context.Racks.AnyAsync(r => r.Code == dto.Code))
            {
                throw new InvalidOperationException($"Rack with code {dto.Code} already exists.");
            }

            var rack = new Rack
            {
                Code = dto.Code,
                Rows = dto.Rows,
                Columns = dto.Columns,
                MinTemperature = dto.MinTemperature,
                MaxTemperature = dto.MaxTemperature,
                MaxWeightKg = dto.MaxWeightKg,
                MaxItemWidthMm = dto.MaxItemWidthMm,
                MaxItemHeightMm = dto.MaxItemHeightMm,
                MaxItemDepthMm = dto.MaxItemDepthMm,
                Comment = dto.Comment,
                IsActive = true
            };
            
            // Automatically generate slots based on the grid dimensions (Rows x Columns).
            // This initializes the rack as fully empty and available.
            for (int x = 1; x <= dto.Columns; x++)
            {
                for (int y = 1; y <= dto.Rows; y++)
                {
                    rack.Slots.Add(new RackSlot
                    {
                        X = x,
                        Y = y,
                        Status = RackSlotStatus.Available
                    });
                }
            }

            context.Racks.Add(rack);
            await context.SaveChangesAsync();

            logger.LogInformation($"Created rack {rack.Code} with {rack.Slots.Count} slots.");
            return MapToDto(rack);
        }
        
        /// <summary>
        /// Updates an existing Rack's properties.
        /// Includes strict validation to ensure that changing the rack's physical constraints (e.g., shrinking dimensions)
        /// does not conflict with items currently stored in it.
        /// </summary>
        public async Task<RackDto> UpdateRackAsync(int id, RackUpdateDto dto)
        {
            var rack = await context.Racks
                .Include(r => r.Slots)
                .ThenInclude(s => s.CurrentItem)
                .ThenInclude(i => i!.Product)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (rack == null)
            {
                throw new KeyNotFoundException($"Rack with ID {id} not found.");
            }

            // Validate new constraints against currently stored items
            // We cannot allow an update that renders the current inventory physically impossible/unsafe.
            var storedItems = rack.Slots
                .Where(s => s.CurrentItem != null)
                .Select(s => s.CurrentItem!.Product)
                .ToList();

            if (storedItems.Any())
            {
                // Temperature validation - a new range must cover all products
                foreach (var product in storedItems)
                {
                    // Temperature constraints (Rack must be safe for the product)
                    // The rack's range must cover the product's requirement.
                    // So basically, if a product requires 2-6C, then the rack needs
                    // to provide 2-6, or 3-6, or 4-5, etc.
                    if (dto.MinTemperature < product.RequiredMinTemp || 
                        dto.MaxTemperature > product.RequiredMaxTemp)
                    {
                        throw new InvalidOperationException(
                            $"Cannot update rack: Product '{product.Name}' requires " +
                            $"{product.RequiredMinTemp}°C - {product.RequiredMaxTemp}°C, " +
                            $"but new rack range is {dto.MinTemperature}°C - {dto.MaxTemperature}°C");
                    }
                }

                // Dimension validation - new limits must fit all products
                foreach (var product in storedItems)
                {
                    if (product.WidthMm > dto.MaxItemWidthMm || 
                        product.HeightMm > dto.MaxItemHeightMm || 
                        product.DepthMm > dto.MaxItemDepthMm)
                    {
                        throw new InvalidOperationException(
                            $"Cannot update rack: Product '{product.Name}' dimensions " +
                            $"{product.WidthMm}x{product.HeightMm}x{product.DepthMm}mm exceed " +
                            $"new limits {dto.MaxItemWidthMm}x{dto.MaxItemHeightMm}x{dto.MaxItemDepthMm}mm");
                    }
                }

                // Weight validation - a new limit must handle the current load
                var currentTotalWeight = storedItems.Sum(p => p.WeightKg);
                if (currentTotalWeight > dto.MaxWeightKg)
                {
                    throw new InvalidOperationException(
                        $"Cannot update rack: Current load is {currentTotalWeight:F2}kg, " +
                        $"but new weight limit is {dto.MaxWeightKg}kg");
                }
            }

            // Apply updates
            rack.MinTemperature = dto.MinTemperature;
            rack.MaxTemperature = dto.MaxTemperature;
            rack.MaxWeightKg = dto.MaxWeightKg;
            rack.MaxItemWidthMm = dto.MaxItemWidthMm;
            rack.MaxItemHeightMm = dto.MaxItemHeightMm;
            rack.MaxItemDepthMm = dto.MaxItemDepthMm;
            rack.Comment = dto.Comment;
            rack.UpdatedAt = DateTime.UtcNow;

            await context.SaveChangesAsync();

            logger.LogInformation($"Updated rack {rack.Code} (ID: {id})");
            return MapToDto(rack);
        }

        /// <summary>
        /// Soft-deletes a rack.
        /// Renames the rack Code (e.g., "ARCHIVED: R-01") to allow the physical label/barcode 
        /// to be reused for a new rack in the future.
        /// </summary>
        public async Task DeleteRackAsync(int id)
        {
            // Check if Rack is empty (cannot delete if not)
            bool hasItems = await context.Racks
                .Where(r => r.Id == id)
                .SelectMany(r => r.Slots)
                .AnyAsync(s => s.CurrentItem != null);

            if (hasItems)
            {
                var rackCode = await context.Racks
                    .Where(r => r.Id == id)
                    .Select(r => r.Code)
                    .FirstOrDefaultAsync() ?? "Unknown";

                throw new InvalidOperationException(
                    $"Cannot delete rack {rackCode} because it contains items. " +
                    "Please move items first.");
            }

            var rack = await context.Racks.FindAsync(id);
            if (rack != null)
            {
                // Softly delete
                rack.IsActive = false;

                // Rename it to free up the code for future use
                // Pattern: "ARCHIVED: R-01", then "ARCHIVED_1: R-01", "ARCHIVED_2: R-01", etc.
                string originalCode = rack.Code;
                string newCode = $"ARCHIVED: {originalCode}";
                int counter = 1;

                // We must use IgnoreQueryFilters to check against other archived items
                while (await context.Racks.IgnoreQueryFilters().AnyAsync(r => r.Code == newCode))
                {
                    newCode = $"ARCHIVED_{counter}: {originalCode}";
                    counter++;
                }

                rack.Code = newCode;
                
                // Add a comment about the deletion date for clarity
                rack.Comment = $"{rack.Comment} - [Deleted at {DateTime.UtcNow}]".Trim();

                await context.SaveChangesAsync();
                logger.LogInformation($"Rack {id} soft-deleted and renamed to '{newCode}'.");
            }
        }

        /// <summary>
        /// Imports multiple rack definitions from a CSV stream.
        /// </summary>
        /// <returns>Success count, error count, and a list of error messages.</returns>
        public async Task<(int successCount, int errorCount, List<string> errors)> ImportRacksFromCsvAsync(Stream fileStream)
        {
            var errors = new List<string>();
            var validDtos = new List<RackCreateDto>();
            int successCount = 0;
            int errorCount = 0;

            using var reader = new StreamReader(fileStream);
            
            var config = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                Delimiter = ";",
                Comment = '#',
                AllowComments = true,
                HasHeaderRecord = false,
                MissingFieldFound = null,
                BadDataFound = null
            };

            using var csv = new CsvReader(reader, config);
            
            csv.Context.RegisterClassMap<RackImportMap>();

            int lineNumber = 0;
            
            // Read all valid records into memory
            while (await csv.ReadAsync())
            {
                lineNumber++;
                try
                {
                    var dto = csv.GetRecord<RackCreateDto>();
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

            // Duplicate validation
            
            // Remove duplicates within the file based on Code
            // So if the user pasted the same rack twice in the CSV, we will take the first one.
            var distinctDtos = validDtos.DistinctBy(d => d.Code).ToList();
            if (distinctDtos.Count < validDtos.Count)
            {
                var removedCount = validDtos.Count - distinctDtos.Count;
                errors.Add($"Skipped {removedCount} duplicate rack(s) found within the CSV file.");
                errorCount += removedCount;
            }

            // Check against the database
            var newRackCodes = distinctDtos.Select(d => d.Code).ToList();
            var existingRackCodes = await context.Racks
                .Where(r => newRackCodes.Contains(r.Code))
                .Select(r => r.Code)
                .ToListAsync();

            var racksToAdd = new List<Rack>();

            foreach (var dto in distinctDtos)
            {
                if (existingRackCodes.Contains(dto.Code))
                {
                    errors.Add($"Rack with Code '{dto.Code}' already exists in the database. Skipped.");
                    errorCount++;
                    continue;
                }

                // Map DTO to Entity
                var rack = new Rack
                {
                    Code = dto.Code,
                    Rows = dto.Rows,
                    Columns = dto.Columns,
                    MinTemperature = dto.MinTemperature,
                    MaxTemperature = dto.MaxTemperature,
                    MaxWeightKg = dto.MaxWeightKg,
                    MaxItemWidthMm = dto.MaxItemWidthMm,
                    MaxItemHeightMm = dto.MaxItemHeightMm,
                    MaxItemDepthMm = dto.MaxItemDepthMm,
                    Comment = dto.Comment,
                    IsActive = true
                };

                // Generate slots in memory
                for (int x = 1; x <= dto.Columns; x++)
                {
                    for (int y = 1; y <= dto.Rows; y++)
                    {
                        rack.Slots.Add(new RackSlot
                        {
                            X = x,
                            Y = y,
                            Status = RackSlotStatus.Available
                        });
                    }
                }

                racksToAdd.Add(rack);
            }

            // Insert Racks
            if (racksToAdd.Any())
            {
                await context.Racks.AddRangeAsync(racksToAdd);
                await context.SaveChangesAsync();

                successCount += racksToAdd.Count;
                logger.LogInformation("Bulk imported {Count} racks from CSV. Success: {Success}, Errors: {Errors}", 
                    racksToAdd.Count, successCount, errorCount);
            }
            else
            {
                logger.LogWarning("No racks were imported. Total errors: {ErrorCount}", errorCount);
            }
            return (successCount, errorCount, errors);
        }
        
        private sealed class RackImportMap : ClassMap<RackCreateDto>
        {
            public RackImportMap()
            {
                Map(m => m.Code).Index(0);
                Map(m => m.Rows).Index(1);
                Map(m => m.Columns).Index(2);
                Map(m => m.MinTemperature).Index(3);
                Map(m => m.MaxTemperature).Index(4);
                Map(m => m.MaxWeightKg).Index(5);
                Map(m => m.MaxItemWidthMm).Index(6);
                Map(m => m.MaxItemHeightMm).Index(7);
                Map(m => m.MaxItemDepthMm).Index(8);
                Map(m => m.Comment).Index(9);
            }
        }
        
    }
}
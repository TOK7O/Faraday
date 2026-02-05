using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Faraday.API.Data;
using Faraday.API.DTOs;
using Faraday.API.Models;
using Faraday.API.Services.Interfaces;

namespace Faraday.API.Services
{
    public class RackService : IRackService
    {
        private readonly FaradayDbContext _context;
        private readonly ILogger<RackService> _logger;

        public RackService(FaradayDbContext context, ILogger<RackService> logger)
        {
            _context = context;
            _logger = logger;
        }

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
            var racks = await _context.Racks
                .Include(r => r.Slots)
                .OrderBy(r => r.Code)
                .ToListAsync();

            return racks.Select(MapToDto);
        }

        public async Task<RackDto?> GetRackByIdAsync(int id)
        {
            var rack = await _context.Racks
                .Include(r => r.Slots)
                .FirstOrDefaultAsync(r => r.Id == id);

            return rack == null ? null : MapToDto(rack);
        }

        public async Task<RackDto> CreateRackAsync(RackCreateDto dto)
        {
            if (await _context.Racks.AnyAsync(r => r.Code == dto.Code))
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

            _context.Racks.Add(rack);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Created rack {rack.Code} with {rack.Slots.Count} slots.");
            return MapToDto(rack);
        }

        public async Task DeleteRackAsync(int id)
        {
            var rack = await _context.Racks.FindAsync(id);
            if (rack != null)
            {
                rack.IsActive = false;
                await _context.SaveChangesAsync();
            }
        }

        public async Task<(int successCount, int errorCount, List<string> errors)> ImportRacksFromCsvAsync(Stream fileStream)
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
                
                // Ignore "#"
                if (line.TrimStart().StartsWith("#")) continue;

                var parts = line.Split(';');
                
                if (parts.Length < 10)
                {
                    errors.Add($"Line {lineNumber}: Invalid format. Expected at least 10 columns.");
                    errorCount++;
                    continue;
                }

                try
                {
                    var dto = new RackCreateDto
                    {
                        Code = parts[0].Trim(),
                        Rows = int.Parse(parts[1], CultureInfo.InvariantCulture),
                        Columns = int.Parse(parts[2], CultureInfo.InvariantCulture),
                        MinTemperature = decimal.Parse(parts[3], CultureInfo.InvariantCulture),
                        MaxTemperature = decimal.Parse(parts[4], CultureInfo.InvariantCulture),
                        MaxWeightKg = decimal.Parse(parts[5], CultureInfo.InvariantCulture),
                        MaxItemWidthMm = decimal.Parse(parts[6], CultureInfo.InvariantCulture),
                        MaxItemHeightMm = decimal.Parse(parts[7], CultureInfo.InvariantCulture),
                        MaxItemDepthMm = decimal.Parse(parts[8], CultureInfo.InvariantCulture),
                        Comment = parts[9].Trim()
                    };

                    await CreateRackAsync(dto);
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
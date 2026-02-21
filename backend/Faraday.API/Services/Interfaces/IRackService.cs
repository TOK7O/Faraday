using Faraday.API.DTOs;
using Faraday.API.Models;

namespace Faraday.API.Services.Interfaces
{
    public interface IRackService
    {
        /// <summary>
        /// Defines a new storage rack in the warehouse structure with specific dimensions,
        /// weight limits, and temperature range.
        /// </summary>
        Task<RackDto> CreateRackAsync(RackCreateDto dto);

        /// <summary>
        /// Parses a CSV stream to bulk create products. Returns statistics (success/error counts).
        /// </summary>
        Task<(int successCount, int errorCount, List<string> errors)> ImportRacksFromCsvAsync(Stream fileStream);

        /// <summary>
        /// Retrieves the complete list of all racks currently defined in the warehouse.
        /// </summary>
        Task<IEnumerable<RackDto>> GetAllRacksAsync();

        /// <summary>
        /// Retrieves detailed information about a specific rack by its unique ID.
        /// </summary>
        Task<RackDto?> GetRackByIdAsync(int id);
        
        /// <summary>
        /// Updates the physical constraints and metadata of an existing rack.
        /// Validates that current inventory still meets new requirements.
        /// </summary>
        Task<RackDto> UpdateRackAsync(int id, RackUpdateDto dto);

        /// <summary>
        /// Permanently removes a rack definition from the system.
        /// </summary>
        Task DeleteRackAsync(int id);
    }
}
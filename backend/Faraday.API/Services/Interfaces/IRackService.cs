using Faraday.API.DTOs;
using Faraday.API.Models;

namespace Faraday.API.Services.Interfaces
{
    public interface IRackService
    {
        Task<RackDto> CreateRackAsync(RackCreateDto dto);
        Task<(int successCount, int errorCount, List<string> errors)> ImportRacksFromCsvAsync(Stream fileStream);
        Task<IEnumerable<RackDto>> GetAllRacksAsync();
        Task<RackDto?> GetRackByIdAsync(int id);
        Task DeleteRackAsync(int id);
    }
}
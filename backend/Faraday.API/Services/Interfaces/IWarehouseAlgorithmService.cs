using Faraday.API.Models;

namespace Faraday.API.Services.Interfaces;

public interface IWarehouseAlgorithmService
{
    /// <summary>
    /// Finds the best available slot for a specific product.
    /// If one is not found, it throws an exception (also the error message provides
    /// contexts as to why it happened).
    /// </summary>
    Task<RackSlot> FindBestSlotForProductAsync(int productDefinitionId);
}
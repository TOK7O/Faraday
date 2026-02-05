using Faraday.API.Models;

namespace Faraday.API.Services.Interfaces
{
    public interface IWarehouseAlgorithmService
    {
        /// <summary>
        /// Finds the best available slot for a specific product.
        /// If one is not found, it throws exceptions if no suitable slot is found (to explain WHY).
        /// </summary>
        Task<RackSlot> FindBestSlotForProductAsync(int productDefinitionId);
    }
}
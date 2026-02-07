using Faraday.API.DTOs;

namespace Faraday.API.Services.Interfaces
{
    public interface IProductService
    {
        /// <summary>
        /// Creates a new product definition in the system based on the provided DTO.
        /// </summary>
        Task<ProductDto> CreateProductAsync(ProductCreateDto dto);

        /// <summary>
        /// Parses a CSV stream to bulk create products. Returns statistics (success/error counts).
        /// </summary>
        Task<(int successCount, int errorCount, List<string> errors)> ImportProductsFromCsvAsync(Stream fileStream);

        /// <summary>
        /// Retrieves a list of all defined products available in the system.
        /// </summary>
        Task<IEnumerable<ProductDto>> GetAllProductsAsync();

        /// <summary>
        /// Retrieves specific product details by its unique internal ID.
        /// </summary>
        Task<ProductDto?> GetProductByIdAsync(int id);

        /// <summary>
        /// Finds a product definition based on its scanCode (barcode or QR).
        /// </summary>
        Task<ProductDto?> GetProductByScanCodeAsync(string scanCode);

        /// <summary>
        /// Removes a product definition from the system (by marking it as inactive).
        /// </summary>
        Task DeleteProductAsync(int id);
    }
}
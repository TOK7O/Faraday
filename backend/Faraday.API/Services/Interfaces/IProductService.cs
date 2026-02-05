using Faraday.API.DTOs;

namespace Faraday.API.Services.Interfaces
{
    public interface IProductService
    {
        Task<ProductDto> CreateProductAsync(ProductCreateDto dto);
        Task<(int successCount, int errorCount, List<string> errors)> ImportProductsFromCsvAsync(Stream fileStream);
        Task<IEnumerable<ProductDto>> GetAllProductsAsync();
        Task<ProductDto?> GetProductByIdAsync(int id);
        Task<ProductDto?> GetProductByBarcodeAsync(string barcode);
        Task DeleteProductAsync(int id);
    }
}
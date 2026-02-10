using Faraday.API.DTOs;
using Faraday.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Faraday.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ProductController : ControllerBase
    {
        private readonly IProductService _productService;
        private readonly ILogger<ProductController> _logger;

        public ProductController(
            IProductService productService, 
            ILogger<ProductController> logger)
        {
            _productService = productService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProductDto>>> GetAll()
        {
            _logger.LogInformation("Retrieving all products");
            var products = await _productService.GetAllProductsAsync();
            return Ok(products);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ProductDto>> GetById(int id)
        {
            _logger.LogInformation("Retrieving product by ID: {ProductId}", id);
            var product = await _productService.GetProductByIdAsync(id);
            if (product == null)
            {
                return NotFound($"Product with ID {id} not found.");
            }
            return Ok(product);
        }

        [HttpGet("scanCode/{scanCode}")]
        public async Task<ActionResult<ProductDto>> GetScanCode(string scanCode)
        {
            _logger.LogInformation("Retrieving product by scan code: {ScanCode}", scanCode);
            var product = await _productService.GetProductByScanCodeAsync(scanCode);
            if (product == null)
            {
                return NotFound($"Product with scanCode {scanCode} not found.");
            }
            return Ok(product);
        }

        [HttpPost]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ProductDto>> Create(ProductCreateDto dto)
        {
            try
            {
                _logger.LogInformation("Product creation initiated: {ProductName}", dto.Name);
                var createdProduct = await _productService.CreateProductAsync(dto);
                _logger.LogInformation("Product created successfully: " +
                                       "{ProductName} (ID: {ProductId})", 
                                        createdProduct.Name, createdProduct.Id);
                return CreatedAtAction(nameof(GetById), new { id = createdProduct.Id }, createdProduct);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
        
        [HttpPut("{id}")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<ProductDto>> Update(int id, ProductUpdateDto dto)
        {
            try
            {
                _logger.LogInformation("Product update initiated for ID: {ProductId}", id);
                var updatedProduct = await _productService.UpdateProductAsync(id, dto);
                return Ok(updatedProduct);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                // Validation failed - new specs incompatible with current rack placements
                return Conflict(ex.Message);
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> Delete(int id)
        {
            _logger.LogInformation("Product deletion initiated for ID: {ProductId}", id);
            await _productService.DeleteProductAsync(id);
            _logger.LogInformation("Product soft-deleted successfully. ID: {ProductId}", id);
            return NoContent();
        }

        [HttpPost("import")]
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> ImportCsv(IFormFile? file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest("No file uploaded.");
            }

            if (!file.FileName.EndsWith(".csv"))
            {
                return BadRequest("File must be a CSV.");
            }
            _logger.LogInformation("Product CSV import initiated. Filename: {FileName}", file.FileName);
            using var stream = file.OpenReadStream();
            var result = await _productService.ImportProductsFromCsvAsync(stream);
            _logger.LogInformation("Product CSV import completed. Success: " +
                                   "{SuccessCount}, Errors: {ErrorCount}", 
                                    result.successCount, result.errorCount);
            return Ok(new
            {
                Message = "Import completed",
                SuccessCount = result.successCount,
                ErrorCount = result.errorCount,
                Errors = result.errors
            });
        }
    }
}
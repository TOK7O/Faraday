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

        public ProductController(IProductService productService)
        {
            _productService = productService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProductDto>>> GetAll()
        {
            var products = await _productService.GetAllProductsAsync();
            return Ok(products);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ProductDto>> GetById(int id)
        {
            var product = await _productService.GetProductByIdAsync(id);
            if (product == null)
            {
                return NotFound($"Product with ID {id} not found.");
            }
            return Ok(product);
        }

        [HttpGet("barcode/{barcode}")]
        public async Task<ActionResult<ProductDto>> GetByBarcode(string barcode)
        {
            var product = await _productService.GetProductByBarcodeAsync(barcode);
            if (product == null)
            {
                return NotFound($"Product with barcode {barcode} not found.");
            }
            return Ok(product);
        }

        [HttpPost]
        public async Task<ActionResult<ProductDto>> Create(ProductCreateDto dto)
        {
            try
            {
                var createdProduct = await _productService.CreateProductAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = createdProduct.Id }, createdProduct);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Administrator,Manager")]
        public async Task<IActionResult> Delete(int id)
        {
            await _productService.DeleteProductAsync(id);
            return NoContent();
        }

        [HttpPost("import")]
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

            using var stream = file.OpenReadStream();
            var result = await _productService.ImportProductsFromCsvAsync(stream);

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
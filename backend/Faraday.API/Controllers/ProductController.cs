using Faraday.API.DTOs;
using Faraday.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Faraday.API.Controllers;

/// <summary>
/// API Controller for managing the Product Catalog.
/// Handles CRUD operations, search by scan code, and bulk CSV imports.
/// Distinguishes between "Product Definitions" (this controller) and "Inventory Items" (physical instances).
/// </summary>
[Route("api/[controller]")]
[ApiController]
[Authorize]
public class ProductController(
    IProductService productService,
    ILogger<ProductController> logger)
    : ControllerBase
{
    /// <summary>
    /// Retrieves the full list of active product definitions.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetAll()
    {
        logger.LogInformation("Retrieving all products");
        var products = await productService.GetAllProductsAsync();
        return Ok(products);
    }

    /// <summary>
    /// Retrieves details for a specific product by its database ID.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<ProductDto>> GetById(int id)
    {
        logger.LogInformation("Retrieving product by ID: {ProductId}", id);
        var product = await productService.GetProductByIdAsync(id);
        if (product == null)
        {
            return NotFound($"Product with ID {id} not found.");
        }
        return Ok(product);
    }

    /// <summary>
    /// Look up a product by its unique barcode or QR code (ScanCode).
    /// </summary>
    [HttpGet("scanCode/{scanCode}")]
    public async Task<ActionResult<ProductDto>> GetScanCode(string scanCode)
    {
        logger.LogInformation("Retrieving product by scan code: {ScanCode}", scanCode);
        var product = await productService.GetProductByScanCodeAsync(scanCode);
        if (product == null)
        {
            return NotFound($"Product with scanCode {scanCode} not found.");
        }
        return Ok(product);
    }

    /// <summary>
    /// Creates a new product definition.
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ProductDto>> Create(ProductCreateDto dto)
    {
        try
        {
            logger.LogInformation("Product creation initiated: {ProductName}", dto.Name);
            var createdProduct = await productService.CreateProductAsync(dto);

            logger.LogInformation("Product created successfully: " +
                                  "{ProductName} (ID: {ProductId})",
                createdProduct.Name, createdProduct.Id);

            return CreatedAtAction(nameof(GetById), new { id = createdProduct.Id }, createdProduct);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Updates an existing product definition.
    /// <para>
    /// Remember that this operation triggers complex validation in the service layer.
    /// If the update (e.g., changing dimensions or temp requirements) conflicts with
    /// physical items currently stored in racks, the service will throw an exception.
    /// </para>
    /// </summary>
    [HttpPut("{id}")]
    [Authorize]
    public async Task<ActionResult<ProductDto>> Update(int id, ProductUpdateDto dto)
    {
        try
        {
            logger.LogInformation("Product update initiated for ID: {ProductId}", id);
            var updatedProduct = await productService.UpdateProductAsync(id, dto);
            return Ok(updatedProduct);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
    }

    /// <summary>
    /// Soft-deletes a product.
    /// The service layer handles archiving the ScanCode to allow reuse.
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> Delete(int id)
    {
        logger.LogInformation("Product deletion initiated for ID: {ProductId}", id);
        await productService.DeleteProductAsync(id);
        logger.LogInformation("Product soft-deleted successfully. ID: {ProductId}", id);
        return NoContent();
    }

    /// <summary>
    /// Bulk import of products via CSV file.
    /// Validation results (successes/errors) are returned in the response body.
    /// </summary>
    [HttpPost("import")]
    [Authorize]
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

        logger.LogInformation("Product CSV import initiated. Filename: {FileName}", file.FileName);

        await using var stream = file.OpenReadStream();
        var result = await productService.ImportProductsFromCsvAsync(stream);

        logger.LogInformation("Product CSV import completed. Success: " +
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
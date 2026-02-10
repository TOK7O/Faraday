using Faraday.API.DTOs;
using Faraday.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Faraday.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ImageRecognitionController : ControllerBase
    {
        private readonly IImageRecognitionService _imageRecognitionService;
        private readonly ILogger<ImageRecognitionController> _logger;

        public ImageRecognitionController(
            IImageRecognitionService imageRecognitionService, 
            ILogger<ImageRecognitionController> logger)
        {
            _imageRecognitionService = imageRecognitionService;
            _logger = logger;
        }

        /// <summary>
        /// Upload reference images for a product (by scan code).
        /// Maximum 10 images per product.
        /// </summary>
        [HttpPost("upload-reference")]
        public async Task<ActionResult<UploadResultDto>> UploadReferenceImages([FromForm] UploadReferenceImagesDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirst("id")!.Value);
                _logger.LogInformation("Reference image upload initiated for product: {ScanCode} by user {UserId}", dto.ScanCode, userId);
                var result = await _imageRecognitionService.UploadReferenceImagesAsync(
                    dto.ScanCode, 
                    dto.Images, 
                    userId);

                if (result.Success)
                    _logger.LogInformation("Reference images uploaded successfully for product: " +
                                           "{ScanCode}. Count: {Count}", dto.ScanCode, result.UploadedCount);
                else
                    _logger.LogWarning("Reference image upload failed for product: " +
                                       "{ScanCode}. Reason: {Message}", dto.ScanCode, result.Message);
                
                return result.Success ? Ok(result) : BadRequest(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new UploadResultDto 
                { 
                    Success = false, 
                    Message = $"Upload failed: {ex.Message}" 
                });
            }
        }

        /// <summary>
        /// Recognize a product from an uploaded image.
        /// Returns product details and confidence score if match found.
        /// </summary>
        [HttpPost("recognize")]
        public async Task<ActionResult<RecognitionResultDto>> RecognizeProduct([FromForm] RecognizeProductDto dto)
        {
            try
            {
                _logger.LogInformation("Product recognition request received");
                var result = await _imageRecognitionService.RecognizeProductAsync(dto.Image);
                
                if (result.Success)
                {
                    _logger.LogInformation("Product recognized successfully: " +
                                           "{ProductName} with confidence {Confidence:P1}", 
                                            result.Product?.Name, result.ConfidenceScore);
                    return Ok(result);
                }
                _logger.LogWarning("Product recognition failed: {Message}", result.Message);
                return NotFound(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new RecognitionResultDto 
                { 
                    Success = false, 
                    Message = $"Recognition failed: {ex.Message}" 
                });
            }
        }

        /// <summary>
        /// Get all reference images for a product by its ID.
        /// </summary>
        [HttpGet("references/product/{productId}")]
        public async Task<ActionResult<List<ProductImageDto>>> GetReferenceImagesByProductId(int productId)
        {
            try
            {
                _logger.LogInformation("Retrieving reference images for product ID: {ProductId}", productId);
                var images = await _imageRecognitionService.GetReferenceImagesByProductIdAsync(productId);
                return Ok(images);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }

        /// <summary>
        /// Get all reference images for a product by its scan code.
        /// </summary>
        [HttpGet("references/scancode/{scanCode}")]
        public async Task<ActionResult<List<ProductImageDto>>> GetReferenceImagesByScanCode(string scanCode)
        {
            try
            {
                _logger.LogInformation("Retrieving reference images for product scan code: {ScanCode}", scanCode);
                var images = await _imageRecognitionService.GetReferenceImagesByScanCodeAsync(scanCode);
                return Ok(images);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }

        /// <summary>
        /// Get count of reference images for a specific product.
        /// </summary>
        [HttpGet("references/count/{productId}")]
        public async Task<ActionResult<int>> GetReferenceImageCount(int productId)
        {
            var count = await _imageRecognitionService.GetReferenceImageCountAsync(productId);
            return Ok(new { ProductId = productId, Count = count, MaxAllowed = 10 });
        }

        /// <summary>
        /// Delete a specific reference image by its ID.
        /// </summary>
        [HttpDelete("reference/{imageId}")]
        [Authorize(Roles = "Administrator,Manager")]
        public async Task<IActionResult> DeleteReferenceImage(int imageId)
        {
            try
            {
                _logger.LogInformation("Reference image deletion requested. Image ID: {ImageId}", imageId);
                await _imageRecognitionService.DeleteReferenceImageAsync(imageId);
                _logger.LogInformation("Reference image deleted successfully. Image ID: {ImageId}", imageId);
                return Ok(new { Message = "Reference image deleted successfully." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Delete failed: {ex.Message}");
            }
        }
        
        //// <summary>
        /// Get the actual image file by its unique GUID.
        /// Returns the image as a downloadable file.
        /// </summary>
        [HttpGet("image/{imageGuid}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetImageFile(Guid imageGuid)
        {
            try
            {
                // Przekazujemy GUID do serwisu
                var (fileStream, contentType, fileName) = await _imageRecognitionService.GetImageFileAsync(imageGuid);

                // Zwracamy plik
                return File(fileStream, contentType, fileName, enableRangeProcessing: true);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { Message = ex.Message });
            }
            catch (FileNotFoundException ex)
            {
                return NotFound(new { Message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"Error retrieving image: {ex.Message}" });
            }
        }
    }
}
using Faraday.API.DTOs;
using Faraday.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Faraday.API.Controllers
{
    /// <summary>
    /// API Controller for handling computer vision operations.
    /// Manages the uploading of reference images for matching and the actual product recognition process.
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ImageRecognitionController(
        IImageRecognitionService imageRecognitionService,
        ILogger<ImageRecognitionController> logger)
        : ControllerBase
    {
        /// <summary>
        /// Upload reference images for a product (by scan code).
        /// These images serve as the basis for the visual recognition algorithm.
        /// A maximum of 10 images per product is allowed to maintain performance.
        /// </summary>
        [HttpPost("upload-reference")]
        public async Task<ActionResult<UploadResultDto>> UploadReferenceImages([FromForm] UploadReferenceImagesDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirst("id")!.Value);
                logger.LogInformation("Reference image upload initiated for product: {ScanCode} by user {UserId}", dto.ScanCode, userId);
                
                var result = await imageRecognitionService.UploadReferenceImagesAsync(
                    dto.ScanCode, 
                    dto.Images, 
                    userId);

                if (result.Success)
                    logger.LogInformation("Reference images uploaded successfully for product: " +
                                           "{ScanCode}. Count: {Count}", dto.ScanCode, result.UploadedCount);
                else
                    logger.LogWarning("Reference image upload failed for product: " +
                                       "{ScanCode}. Reason: {Message}", dto.ScanCode, result.Message);
                
                return result.Success ? Ok(result) : BadRequest(result);
            }
            catch (Exception ex)
            {
                // If something unexpected breaks during file I/O
                return StatusCode(500, new UploadResultDto 
                { 
                    Success = false, 
                    Message = $"Upload failed: {ex.Message}" 
                });
            }
        }

        /// <summary>
        /// Recognize a product from an uploaded image.
        /// Compares the uploaded image against the reference library.
        /// Returns product details and confidence score if a match is found.
        /// </summary>
        [HttpPost("recognize")]
        public async Task<ActionResult<RecognitionResultDto>> RecognizeProduct([FromForm] RecognizeProductDto dto)
        {
            try
            {
                logger.LogInformation("Product recognition request received");
                var result = await imageRecognitionService.RecognizeProductAsync(dto.Image);
                
                if (result.Success)
                {
                    logger.LogInformation("Product recognized successfully: " +
                                           "{ProductName} with confidence {Confidence:P1}", 
                                            result.Product?.Name, result.ConfidenceScore);
                    return Ok(result);
                }
                
                logger.LogWarning("Product recognition failed: {Message}", result.Message);
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
        /// Get all reference images associated with a specific product ID.
        /// </summary>
        [HttpGet("references/product/{productId}")]
        public async Task<ActionResult<List<ProductImageDto>>> GetReferenceImagesByProductId(int productId)
        {
            try
            {
                logger.LogInformation("Retrieving reference images for product ID: {ProductId}", productId);
                var images = await imageRecognitionService.GetReferenceImagesByProductIdAsync(productId);
                return Ok(images);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }

        /// <summary>
        /// Get all reference images associated with a product scan code (barcode/QR).
        /// </summary>
        [HttpGet("references/scancode/{scanCode}")]
        public async Task<ActionResult<List<ProductImageDto>>> GetReferenceImagesByScanCode(string scanCode)
        {
            try
            {
                logger.LogInformation("Retrieving reference images for product scan code: {ScanCode}", scanCode);
                var images = await imageRecognitionService.GetReferenceImagesByScanCodeAsync(scanCode);
                return Ok(images);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
        }

        /// <summary>
        /// Get count of existing reference images for a specific product.
        /// </summary>
        [HttpGet("references/count/{productId}")]
        public async Task<ActionResult<int>> GetReferenceImageCount(int productId)
        {
            var count = await imageRecognitionService.GetReferenceImageCountAsync(productId);
            return Ok(new { ProductId = productId, Count = count, MaxAllowed = 10 });
        }

        /// <summary>
        /// Delete a specific reference image by its ID.
        /// Restricted to Administrators to prevent accidental data loss of training sets.
        /// </summary>
        [HttpDelete("reference/{imageId}")]
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> DeleteReferenceImage(int imageId)
        {
            try
            {
                logger.LogInformation("Reference image deletion requested. Image ID: {ImageId}", imageId);
                await imageRecognitionService.DeleteReferenceImageAsync(imageId);
                logger.LogInformation("Reference image deleted successfully. Image ID: {ImageId}", imageId);
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
        
        /// <summary>
        /// Get the actual image file content by its unique GUID.
        /// Returns the image as a downloadable binary stream.
        /// </summary>
        /// <remarks>
        /// This endpoint is anonymous to allow embedding images in `img` tags 
        /// where setting Authorization headers might be challenging or impossible (e.g., standard HTML).
        /// Security relies on the GUID being hard to guess, as it's nearly impossible.
        /// </remarks>
        [HttpGet("image/{imageGuid}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetImageFile(Guid imageGuid)
        {
            try
            {
                var (fileStream, contentType, fileName) = await imageRecognitionService.GetImageFileAsync(imageGuid);
                return File(fileStream, contentType, fileName, enableRangeProcessing: true);
            }
            catch (KeyNotFoundException ex)
            {
                // Database record not found
                return NotFound(new { ex.Message });
            }
            catch (FileNotFoundException ex)
            {
                // Physical file missing from disk
                return NotFound(new { ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = $"Error retrieving image: {ex.Message}" });
            }
        }
    }
}
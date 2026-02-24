using Faraday.API.DTOs;

namespace Faraday.API.Services.Interfaces;

public interface IImageRecognitionService
{
    /// <summary>
    /// Uploads reference images for a product and extracts feature vectors.
    /// </summary>
    Task<UploadResultDto> UploadReferenceImagesAsync(string scanCode, List<IFormFile> images, int userId);

    /// <summary>
    /// Recognizes a product from an uploaded image using feature vector similarity.
    /// </summary>
    Task<RecognitionResultDto> RecognizeProductAsync(IFormFile image);

    /// <summary>
    /// Gets all reference images for a specific product.
    /// </summary>
    Task<List<ProductImageDto>> GetReferenceImagesByProductIdAsync(int productId);

    /// <summary>
    /// Gets all reference images for a product by its scan code.
    /// </summary>
    Task<List<ProductImageDto>> GetReferenceImagesByScanCodeAsync(string scanCode);

    /// <summary>
    /// Deletes a specific reference image.
    /// </summary>
    Task DeleteReferenceImageAsync(int imageId);

    /// <summary>
    /// Gets count of reference images for a product.
    /// </summary>
    Task<int> GetReferenceImageCountAsync(int productId);
        
    /// <summary>
    /// Gets the physical image file by image GUID.
    /// </summary>
    Task<(Stream fileStream, string contentType, string fileName)> GetImageFileAsync(Guid imageGuid);
}
using System.Text.Json;
using Faraday.API.Data;
using Faraday.API.DTOs;
using Faraday.API.Models;
using Faraday.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace Faraday.API.Services;

public class ImageRecognitionService : IImageRecognitionService
{
    private readonly FaradayDbContext _context;
    private readonly ILogger<ImageRecognitionService> _logger;
    private readonly IWebHostEnvironment _environment;
    private readonly InferenceSession _session;
        
    // Configuration constants
    private const int MaxReferenceImages = 10;
    private const double SimilarityThreshold = 0.70;
    private const double ExcellentMatchThreshold = 0.85;
    private const int ImageSize = 224; // ResNet50 input size
    private const long MaxImageSizeBytes = 10 * 1024 * 1024; // 10MB

    public ImageRecognitionService(
        FaradayDbContext context, 
        ILogger<ImageRecognitionService> logger,
        IWebHostEnvironment environment)
    {
        _context = context;
        _logger = logger;
        _environment = environment;

        // Load ONNX model
        var modelPath = Path.Combine(_environment.ContentRootPath, "RecognitionModels", "resnet50-v2-7.onnx");
            
        if (!File.Exists(modelPath))
        {
            throw new FileNotFoundException($"ONNX model not found at {modelPath}. Please download ResNet50 model.");
        }

        _session = new InferenceSession(modelPath);
        _logger.LogInformation("Image recognition service initialized with ResNet50 model.");
    }

    public async Task<UploadResultDto> UploadReferenceImagesAsync(string scanCode, List<IFormFile> images, int userId)
    {
        var result = new UploadResultDto();

        // Validate product exists
        var product = await _context.Products.FirstOrDefaultAsync(p => p.ScanCode == scanCode);
        switch (product)
        {
            case null:
                result.Success = false;
                result.Message = $"Product with scan code '{scanCode}' not found.";
                return result;
        }

        // Check the current reference image count
        var currentCount = await _context.Set<ProductImage>()
            .CountAsync(pi => pi.ProductDefinitionId == product.Id);

        switch (currentCount)
        {
            case >= MaxReferenceImages:
                result.Success = false;
                result.Message = $"Maximum reference images limit ({MaxReferenceImages}) reached for this product.";
                return result;
        }

        // Validate image count
        var availableSlots = MaxReferenceImages - currentCount;
        if (images.Count > availableSlots)
        {
            result.Success = false;
            result.Message = $"Can only upload {availableSlots} more images. Current: {currentCount}/{MaxReferenceImages}";
            return result;
        }

        // Ensure directory exists
        var uploadDir = Path.Combine(_environment.ContentRootPath, "wwwroot", "product-images");
        if (!Directory.Exists(uploadDir))
        {
            Directory.CreateDirectory(uploadDir);
        }

        // Process each image
        foreach (var image in images)
        {
            try
            {
                switch (image.Length)
                {
                    // Validate the file
                    case > MaxImageSizeBytes:
                        result.Errors.Add($"Image {image.FileName} exceeds maximum size of 10MB.");
                        result.FailedCount++;
                        continue;
                }

                if (!IsValidImageType(image.ContentType))
                {
                    result.Errors.Add($"Image {image.FileName} has invalid format. Only JPG, PNG allowed.");
                    result.FailedCount++;
                    continue;
                }

                // Generate unique filename
                var fileName = $"{scanCode}_{Guid.NewGuid()}.jpg";
                var filePath = Path.Combine(uploadDir, fileName);

                // Save image to disk
                await using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await image.CopyToAsync(stream);
                }

                // Extract feature vector
                var featureVector = await ExtractFeatureVectorAsync(filePath);
                var featureVectorJson = JsonSerializer.Serialize(featureVector);

                // Save to the database
                var productImage = new ProductImage
                {
                    ProductDefinitionId = product.Id,
                    ImagePath = fileName,
                    FeatureVector = featureVectorJson,
                    UploadedByUserId = userId
                };

                _context.Set<ProductImage>().Add(productImage);
                result.UploadedCount++;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to process image {image.FileName}");
                result.Errors.Add($"Failed to process {image.FileName}: {ex.Message}");
                result.FailedCount++;
            }
        }

        await _context.SaveChangesAsync();

        result.Success = result.UploadedCount > 0;
        result.Message = result.Success 
            ? $"Successfully uploaded {result.UploadedCount} reference image(s)."
            : "Failed to upload any images.";

        _logger.LogInformation($"Uploaded {result.UploadedCount} reference images for product {scanCode}");
        return result;
    }

    public async Task<RecognitionResultDto> RecognizeProductAsync(IFormFile image)
    {
        var result = new RecognitionResultDto();

        try
        {
            switch (image.Length)
            {
                // Validate image
                case > MaxImageSizeBytes:
                    result.Success = false;
                    result.Message = "Image exceeds maximum size of 10MB.";
                    return result;
            }

            if (!IsValidImageType(image.ContentType))
            {
                result.Success = false;
                result.Message = "Invalid image format. Only JPG, PNG allowed.";
                return result;
            }

            // Save temporarily to extract features
            var tempPath = Path.Combine(Path.GetTempPath(), $"temp_{Guid.NewGuid()}.jpg");
                
            try
            {
                await using (var stream = new FileStream(tempPath, FileMode.Create))
                {
                    await image.CopyToAsync(stream);
                }

                // Extract a feature vector from an uploaded image
                var uploadedFeatures = await ExtractFeatureVectorAsync(tempPath);

                // Get all reference images with their products
                var referenceImages = await _context.Set<ProductImage>()
                    .Include(pi => pi.Product)
                    .Where(pi => pi.Product.IsActive)
                    .ToListAsync();

                switch (referenceImages.Count != 0)
                {
                    case false:
                        result.Success = false;
                        result.Message = "No reference images found in the system. Please upload reference images first.";
                        return result;
                }

                // Find the best match
                double bestSimilarity = 0;
                ProductImage? bestMatch = null;

                foreach (var refImage in referenceImages)
                {
                    var refFeatures = JsonSerializer.Deserialize<float[]>(refImage.FeatureVector);
                    switch (refFeatures)
                    {
                        case null:
                            continue;
                    }

                    var similarity = CalculateCosineSimilarity(uploadedFeatures, refFeatures);

                    if (similarity > bestSimilarity)
                    {
                        bestSimilarity = similarity;
                        bestMatch = refImage;
                    }
                }

                // Evaluate results
                if (bestMatch == null || bestSimilarity < SimilarityThreshold)
                {
                    result.Success = false;
                    result.Message = $"No matching product found. Best similarity: {bestSimilarity:P1} (threshold: {SimilarityThreshold:P1})";
                    result.ConfidenceScore = bestSimilarity;
                    result.ConfidenceLevel = "None";
                    return result;
                }

                // Success - product recognized
                result.Success = true;
                result.ConfidenceScore = bestSimilarity;
                result.ConfidenceLevel = bestSimilarity >= ExcellentMatchThreshold ? "Excellent" : "Good";
                result.Message = $"Product recognized with {result.ConfidenceLevel.ToLower()} confidence ({bestSimilarity:P1})";
                    
                // Map product to DTO
                result.Product = new ProductDto
                {
                    Id = bestMatch.Product.Id,
                    ScanCode = bestMatch.Product.ScanCode,
                    Name = bestMatch.Product.Name,
                    PhotoUrl = bestMatch.Product.PhotoUrl,
                    RequiredMinTemp = bestMatch.Product.RequiredMinTemp,
                    RequiredMaxTemp = bestMatch.Product.RequiredMaxTemp,
                    WeightKg = bestMatch.Product.WeightKg,
                    WidthMm = bestMatch.Product.WidthMm,
                    HeightMm = bestMatch.Product.HeightMm,
                    DepthMm = bestMatch.Product.DepthMm,
                    IsHazardous = bestMatch.Product.IsHazardous,
                    HazardClassification = bestMatch.Product.HazardClassification,
                    ValidityDays = bestMatch.Product.ValidityDays,
                    Comment = bestMatch.Product.Comment,
                    IsActive = bestMatch.Product.IsActive
                };

                _logger.LogInformation($"Product recognized: {result.Product.Name} ({result.ConfidenceScore:P1} confidence)");
            }
            finally
            {
                // Cleanup temp file
                if (File.Exists(tempPath))
                {
                    File.Delete(tempPath);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during image recognition");
            result.Success = false;
            result.Message = $"Recognition failed: {ex.Message}";
        }

        return result;
    }

    public async Task<List<ProductImageDto>> GetReferenceImagesByProductIdAsync(int productId)
    {
        _logger.LogInformation("Fetching reference images for product ID: {ProductId}", productId);
            
        var images = await _context.Set<ProductImage>()
            .Include(pi => pi.Product)
            .Include(pi => pi.UploadedByUser)
            .Where(pi => pi.ProductDefinitionId == productId)
            .OrderByDescending(pi => pi.CreatedAt)
            .Select(pi => new ProductImageDto
            {
                Id = pi.Id,
                ProductDefinitionId = pi.ProductDefinitionId,
                ProductName = pi.Product.Name,
                ImageUrl = $"/product-images/{pi.ImagePath}",
                UploadedAt = pi.CreatedAt,
                UploadedByUsername = pi.UploadedByUser.Username
            })
            .ToListAsync();

        return images;
    }

    public async Task<List<ProductImageDto>> GetReferenceImagesByScanCodeAsync(string scanCode)
    {
        var product = await _context.Products.FirstOrDefaultAsync(p => p.ScanCode == scanCode);
            
        switch (product)
        {
            case null:
                _logger.LogWarning("Cannot fetch reference images - product not found: {ScanCode}", scanCode);
                throw new KeyNotFoundException($"Product with scan code '{scanCode}' not found.");
            default:
                _logger.LogInformation("Fetching reference images for product: " +
                                       "{ProductName} (ScanCode: {ScanCode})", product.Name, scanCode);

                return await GetReferenceImagesByProductIdAsync(product.Id);
        }
    }

    public async Task DeleteReferenceImageAsync(int imageId)
    {
        var image = await _context.Set<ProductImage>().FindAsync(imageId);
            
        switch (image)
        {
            case null:
                throw new KeyNotFoundException($"Reference image with ID {imageId} not found.");
        }

        // Delete the physical file
        var filePath = Path.Combine(_environment.ContentRootPath, "wwwroot", "product-images", image.ImagePath);
        if (File.Exists(filePath))
        {
            File.Delete(filePath);
        }

        // Delete from database
        _context.Set<ProductImage>().Remove(image);
        await _context.SaveChangesAsync();

        _logger.LogInformation($"Deleted reference image {imageId} ({image.ImagePath})");
    }

    public async Task<int> GetReferenceImageCountAsync(int productId)
    {
        _logger.LogInformation("Retrieving reference image count for product ID: {ProductId}", productId);
        return await _context.Set<ProductImage>()
            .CountAsync(pi => pi.ProductDefinitionId == productId);
    }
        
    public async Task<(Stream fileStream, string contentType, string fileName)> GetImageFileAsync(Guid imageGuid)
    {
        // Search for the image where ImagePath contains the provided GUID
        var guidString = imageGuid.ToString();
            
        var image = await _context.Set<ProductImage>()
            .FirstOrDefaultAsync(x => x.ImagePath.Contains(guidString));

        switch (image)
        {
            case null:
                _logger.LogWarning("Image not found for GUID: {ImageGuid}", imageGuid);
                throw new KeyNotFoundException($"Image with GUID {imageGuid} not found.");
        }
        _logger.LogInformation("Serving image file: {ImagePath}", image.ImagePath);

        // Build a full path to the image file
        var filePath = Path.Combine(_environment.ContentRootPath, "wwwroot", "product-images", image.ImagePath);

        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"Image file '{image.ImagePath}' not found on disk.");
        }

        // Determine the content type based on file extension
        var extension = Path.GetExtension(filePath).ToLowerInvariant();
        var contentType = extension switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            _ => "application/octet-stream"
        };

        // Open a file stream
        var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);

        return (fileStream, contentType, image.ImagePath);
    }
    // Extract the feature vector from the image using ResNet50
    private async Task<float[]> ExtractFeatureVectorAsync(string imagePath)
    {
        using var image = await Image.LoadAsync<Rgb24>(imagePath);
            
        // Resize to 224x224 (ResNet50 input)
        image.Mutate(x => x.Resize(new ResizeOptions
        {
            Size = new Size(ImageSize, ImageSize),
            Mode = ResizeMode.Crop
        }));

        // Convert to tensor (NCHW format: batch, channels, height, width)
        var tensor = new DenseTensor<float>([1, 3, ImageSize, ImageSize]);
            
        for (int y = 0; y < ImageSize; y++)
        {
            for (int x = 0; x < ImageSize; x++)
            {
                var pixel = image[x, y];
                    
                // Normalize to [0, 1] and apply ImageNet normalization
                tensor[0, 0, y, x] = (pixel.R / 255f - 0.485f) / 0.229f; // R
                tensor[0, 1, y, x] = (pixel.G / 255f - 0.456f) / 0.224f; // G
                tensor[0, 2, y, x] = (pixel.B / 255f - 0.406f) / 0.225f; // B
            }
        }

        // Run inference
        var inputs = new List<NamedOnnxValue>
        {
            NamedOnnxValue.CreateFromTensor("data", tensor)
        };

        using var results = _session.Run(inputs);
        var output = results.First().AsEnumerable<float>().ToArray();

        return output;
    }

    // Calculate cosine similarity between two feature vectors
    private static double CalculateCosineSimilarity(float[] vectorA, float[] vectorB)
    {
        if (vectorA.Length != vectorB.Length)
        {
            throw new ArgumentException("Vectors must have the same length");
        }

        double dotProduct = 0;
        double magnitudeA = 0;
        double magnitudeB = 0;

        for (int i = 0; i < vectorA.Length; i++)
        {
            dotProduct += vectorA[i] * vectorB[i];
            magnitudeA += vectorA[i] * vectorA[i];
            magnitudeB += vectorB[i] * vectorB[i];
        }

        magnitudeA = Math.Sqrt(magnitudeA);
        magnitudeB = Math.Sqrt(magnitudeB);

        if (magnitudeA == 0 || magnitudeB == 0)
        {
            return 0;
        }

        return dotProduct / (magnitudeA * magnitudeB);
    }

    private static bool IsValidImageType(string contentType)
    {
        var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png" };
        return allowedTypes.Contains(contentType.ToLower());
    }
}
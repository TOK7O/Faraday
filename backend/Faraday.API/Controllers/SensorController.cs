using Faraday.API.DTOs;
using Faraday.API.Middleware;
using Faraday.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Faraday.API.Controllers;

/// <summary>
/// REST API Controller for IoT sensor devices.
/// Provides endpoints for operations that are better suited for HTTP (file uploads)
/// and a health check endpoint for connectivity verification.
///
/// For continuous telemetry (temperature/weight readings), use the SignalR SensorHub instead.
/// </summary>
[Route("api/[controller]")]
[ApiController]
[Authorize(AuthenticationSchemes = SensorApiKeyAuthHandler.SchemeName)]
public class SensorController(
    ISensorService sensorService,
    IImageRecognitionService imageRecognitionService,
    ILogger<SensorController> logger)
    : ControllerBase
{
    /// <summary>
    /// Health check endpoint for sensor devices.
    /// Used by Raspberry Pi to verify connectivity and authentication.
    /// </summary>
    [HttpGet("health")]
    public ActionResult<SensorHealthResponseDto> Health()
    {
        logger.LogDebug("Sensor health check from {RemoteIp}", HttpContext.Connection.RemoteIpAddress);

        return Ok(new SensorHealthResponseDto
        {
            Healthy = true,
            ServerTime = DateTime.UtcNow.ToString("o"),
            Message = "Faraday WMS API is operational. Sensor authentication successful."
        });
    }

    /// <summary>
    /// Fallback REST endpoint for sending a single sensor reading.
    /// Use the SignalR hub for continuous telemetry — this endpoint is for
    /// situations where WebSocket isn't available.
    /// </summary>
    [HttpPost("reading")]
    public async Task<ActionResult<SensorReadingResponseDto>> PostReading([FromBody] SensorReadingDto reading)
    {
        logger.LogDebug("REST sensor reading from {RemoteIp}: Rack={RackCode}",
            HttpContext.Connection.RemoteIpAddress, reading.RackCode);

        var result = await sensorService.ProcessReadingAsync(reading);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    /// <summary>
    /// Fallback REST endpoint for sending batch sensor readings.
    /// Use the SignalR hub for continuous telemetry — this endpoint is for
    /// situations where WebSocket isn't available.
    /// </summary>
    [HttpPost("batch")]
    public async Task<ActionResult<SensorBatchResponseDto>> PostBatchReadings([FromBody] SensorBatchReadingDto dto)
    {
        logger.LogDebug("REST batch readings from {RemoteIp}: {Count} readings",
            HttpContext.Connection.RemoteIpAddress, dto.Readings.Count);

        var result = await sensorService.ProcessBatchReadingsAsync(dto.Readings);
        return Ok(result);
    }

    /// <summary>
    /// Recognize a product from an image captured by the device's camera.
    /// Uses the existing ResNet50 image recognition pipeline.
    /// Returns the recognized product details for display on the device's screen.
    /// </summary>
    [HttpPost("recognize")]
    public async Task<ActionResult<RecognitionResultDto>> RecognizeProduct([FromForm] RecognizeProductDto dto)
    {
        try
        {
            if (dto.Image.Length == 0)
            {
                return BadRequest(new RecognitionResultDto
                {
                    Success = false,
                    Message = "No image provided."
                });
            }

            logger.LogInformation("Product recognition request from sensor device. " +
                                  "Image size: {Size} bytes, IP: {RemoteIp}",
                dto.Image.Length, HttpContext.Connection.RemoteIpAddress);

            var result = await imageRecognitionService.RecognizeProductAsync(dto.Image);

            if (result.Success)
            {
                logger.LogInformation("Sensor device recognition successful: " +
                                      "{ProductName} (confidence: {Confidence:P1})",
                    result.Product?.Name, result.ConfidenceScore);
            }
            else
            {
                logger.LogWarning("Sensor device recognition failed: {Message}", result.Message);
            }

            return result.Success ? Ok(result) : NotFound(result);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Sensor device recognition error");
            return StatusCode(500, new RecognitionResultDto
            {
                Success = false,
                Message = $"Recognition failed: {ex.Message}"
            });
        }
    }
}

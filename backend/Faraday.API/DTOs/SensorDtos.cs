using System.ComponentModel.DataAnnotations;

namespace Faraday.API.DTOs;

/// <summary>
/// Single sensor reading from an IoT device (e.g., Raspberry Pi).
/// Sent via SignalR hub or REST endpoint.
/// </summary>
public class SensorReadingDto
{
    /// <summary>
    /// The rack's unique code (e.g., "R-001"). Used instead of database ID
    /// because it's human-readable and stable across deployments.
    /// </summary>
    [Required]
    [MaxLength(50)]
    public required string RackCode { get; set; }

    /// <summary>
    /// Current temperature reading in Celsius from the temperature sensor.
    /// </summary>
    [Required]
    public decimal Temperature { get; set; }

    /// <summary>
    /// Total weight currently measured by the load cell in kilograms.
    /// </summary>
    [Required]
    [Range(0, double.MaxValue, ErrorMessage = "Weight must be non-negative.")]
    public decimal WeightKg { get; set; }

    /// <summary>
    /// Identifier of the physical device sending the data (e.g., "rpi-warehouse-01").
    /// Used for tracking and diagnostics.
    /// </summary>
    [MaxLength(100)]
    public string? DeviceId { get; set; }

    /// <summary>
    /// Timestamp of the reading at the device. If null, the server will use the current UTC time.
    /// </summary>
    public DateTime? Timestamp { get; set; }
}

/// <summary>
/// Batch of sensor readings from a single device that monitors multiple racks.
/// </summary>
public class SensorBatchReadingDto
{
    [Required]
    [MinLength(1, ErrorMessage = "At least one reading is required.")]
    public required List<SensorReadingDto> Readings { get; set; }
}

/// <summary>
/// Response returned after processing a sensor reading.
/// </summary>
public class SensorReadingResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int? RackId { get; set; }
}

/// <summary>
/// Response for batch sensor readings.
/// </summary>
public class SensorBatchResponseDto
{
    public int TotalReceived { get; set; }
    public int SuccessCount { get; set; }
    public int ErrorCount { get; set; }
    public List<SensorReadingResponseDto> Results { get; set; } = [];
}

/// <summary>
/// Health check response for sensor devices.
/// </summary>
public class SensorHealthResponseDto
{
    public bool Healthy { get; set; }
    public string ServerTime { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

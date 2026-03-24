using Faraday.API.DTOs;

namespace Faraday.API.Services.Interfaces;

public interface ISensorService
{
    /// <summary>
    /// Processes a single sensor reading. Translates rackCode to rackId
    /// and delegates to MonitoringService.
    /// </summary>
    Task<SensorReadingResponseDto> ProcessReadingAsync(SensorReadingDto reading);

    /// <summary>
    /// Processes a batch of sensor readings from a single device.
    /// </summary>
    Task<SensorBatchResponseDto> ProcessBatchReadingsAsync(List<SensorReadingDto> readings);
}

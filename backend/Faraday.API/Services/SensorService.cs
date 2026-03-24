using System.Collections.Concurrent;
using Faraday.API.Data;
using Faraday.API.DTOs;
using Faraday.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Faraday.API.Services;

/// <summary>
/// Processes incoming sensor data from IoT devices (Raspberry Pi).
/// Translates human-readable rack codes to database IDs using an in-memory cache,
/// validates the data, and delegates to MonitoringService for alert generation.
/// </summary>
public class SensorService(
    FaradayDbContext context,
    IMonitoringService monitoringService,
    ILogger<SensorService> logger) : ISensorService
{
    /// <summary>
    /// In-memory cache mapping RackCode → RackId.
    /// Avoids hitting the database on every sensor reading.
    /// Thread-safe for concurrent access from multiple hub connections.
    /// </summary>
    private static readonly ConcurrentDictionary<string, int> RackCodeCache = new();

    public async Task<SensorReadingResponseDto> ProcessReadingAsync(SensorReadingDto reading)
    {
        try
        {
            // Translate rack code to database ID
            var rackId = await ResolveRackIdAsync(reading.RackCode);
            if (rackId == null)
            {
                logger.LogWarning("Sensor reading rejected: unknown rack code '{RackCode}' from device '{DeviceId}'",
                    reading.RackCode, reading.DeviceId);
                return new SensorReadingResponseDto
                {
                    Success = false,
                    Message = $"Unknown rack code: '{reading.RackCode}'"
                };
            }

            // Delegate to the existing monitoring pipeline
            // This handles: updating rack state, recording history, generating alerts via SignalR
            await monitoringService.ProcessRackReadingAsync(rackId.Value, reading.Temperature, reading.WeightKg);

            logger.LogDebug("Sensor reading processed: Rack={RackCode}, Temp={Temperature}°C, Weight={Weight}kg, Device={DeviceId}",
                reading.RackCode, reading.Temperature, reading.WeightKg, reading.DeviceId);

            return new SensorReadingResponseDto
            {
                Success = true,
                Message = "Reading processed",
                RackId = rackId.Value
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error processing sensor reading for rack '{RackCode}'", reading.RackCode);
            return new SensorReadingResponseDto
            {
                Success = false,
                Message = $"Processing error: {ex.Message}"
            };
        }
    }

    public async Task<SensorBatchResponseDto> ProcessBatchReadingsAsync(List<SensorReadingDto> readings)
    {
        var response = new SensorBatchResponseDto
        {
            TotalReceived = readings.Count
        };

        foreach (var reading in readings)
        {
            var result = await ProcessReadingAsync(reading);
            response.Results.Add(result);

            if (result.Success)
                response.SuccessCount++;
            else
                response.ErrorCount++;
        }

        logger.LogInformation("Batch sensor readings processed: {Total} total, {Success} success, {Errors} errors",
            response.TotalReceived, response.SuccessCount, response.ErrorCount);

        return response;
    }

    /// <summary>
    /// Resolves a rack code (e.g., "R-001") to a database ID.
    /// Uses an in-memory cache to avoid repeated DB queries.
    /// Cache entries are never evicted because rack codes rarely change.
    /// If a code is not found in cache, a DB lookup is performed.
    /// </summary>
    private async Task<int?> ResolveRackIdAsync(string rackCode)
    {
        // Check cache first
        if (RackCodeCache.TryGetValue(rackCode, out var cachedId))
        {
            return cachedId;
        }

        // Cache miss — look up in the database
        var rack = await context.Racks
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Code == rackCode && r.IsActive);

        if (rack == null)
        {
            return null;
        }

        // Cache the result for future lookups
        RackCodeCache.TryAdd(rackCode, rack.Id);
        logger.LogDebug("Cached rack code mapping: {RackCode} → {RackId}", rackCode, rack.Id);
        return rack.Id;
    }

    /// <summary>
    /// Clears the rack code cache. Used when racks are created/modified/deleted.
    /// </summary>
    public static void InvalidateCache()
    {
        RackCodeCache.Clear();
    }
}

using Faraday.API.DTOs;
using Faraday.API.Middleware;
using Faraday.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Faraday.API.Hubs;

/// <summary>
/// SignalR Hub for real-time communication with IoT sensor devices (Raspberry Pi).
/// Handles persistent WebSocket connections for continuous sensor telemetry
/// and provides connection lifecycle tracking.
///
/// Authentication: Uses the SensorApiKey scheme (X-Api-Key header or query param).
/// </summary>
[Authorize(AuthenticationSchemes = SensorApiKeyAuthHandler.SchemeName)]
public class SensorHub(
    ISensorService sensorService,
    ILogger<SensorHub> logger) : Hub
{
    /// <summary>
    /// Called when a sensor device establishes a connection.
    /// Logs the device connection for monitoring purposes.
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        var deviceId = Context.GetHttpContext()?.Request.Query["device_id"].ToString() ?? "unknown";
        logger.LogInformation("Sensor device connected. ConnectionId: {ConnectionId}, DeviceId: {DeviceId}, IP: {IP}",
            Context.ConnectionId, deviceId,
            Context.GetHttpContext()?.Connection.RemoteIpAddress);

        await base.OnConnectedAsync();
    }

    /// <summary>
    /// Called when a sensor device disconnects.
    /// </summary>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var reason = exception?.Message ?? "clean disconnect";
        logger.LogWarning("Sensor device disconnected. ConnectionId: {ConnectionId}, Reason: {Reason}",
            Context.ConnectionId, reason);

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Receives a single sensor reading from an IoT device.
    /// Called by the device via: hub.send("SendReading", readingData)
    /// </summary>
    public async Task<SensorReadingResponseDto> SendReading(SensorReadingDto reading)
    {
        logger.LogDebug("SignalR reading received from {ConnectionId}: Rack={RackCode}", 
            Context.ConnectionId, reading.RackCode);

        var result = await sensorService.ProcessReadingAsync(reading);
        return result;
    }

    /// <summary>
    /// Receives a batch of sensor readings from a device monitoring multiple racks.
    /// Called by the device via: hub.send("SendBatchReadings", batchData)
    /// </summary>
    public async Task<SensorBatchResponseDto> SendBatchReadings(List<SensorReadingDto> readings)
    {
        logger.LogDebug("SignalR batch received from {ConnectionId}: {Count} readings",
            Context.ConnectionId, readings.Count);

        var result = await sensorService.ProcessBatchReadingsAsync(readings);
        return result;
    }
}

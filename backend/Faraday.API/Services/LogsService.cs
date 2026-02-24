using System.Collections.Concurrent;
using System.Threading.Channels;
using Faraday.API.Hubs;
using Faraday.API.Models;
using Faraday.API.Services.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace Faraday.API.Services;

public class LogsService : ILogsService, IDisposable
{
    private readonly IHubContext<LogsHub> _hubContext;
    private readonly ILogger<LogsService> _logger;
        
    // Thread-safe circular buffer for last 1000 logs
    private readonly ConcurrentQueue<LogEntry> _logBuffer = new();
    private const int MaxBufferSize = 1000;
        
    // Channel for batching and throttling logs (100 logs/second max)
    private readonly Channel<LogEntry> _logChannel;
    private readonly Task _processingTask;
    private readonly CancellationTokenSource _cancellationTokenSource;

    public LogsService(
        IHubContext<LogsHub> hubContext,
        ILogger<LogsService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
        _cancellationTokenSource = new CancellationTokenSource();
            
        // Unbounded channel for log entries
        _logChannel = Channel.CreateUnbounded<LogEntry>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false
        });
            
        // Start background processing task
        _processingTask = Task.Run(() => ProcessLogsAsync(_cancellationTokenSource.Token));
    }

    public async Task BroadcastLogAsync(LogEntry logEntry)
    {
        // Add to buffer
        _logBuffer.Enqueue(logEntry);
            
        // Maintain buffer size limit
        while (_logBuffer.Count > MaxBufferSize)
        {
            _logBuffer.TryDequeue(out _);
        }
            
        // Send to channel for batched processing
        await _logChannel.Writer.WriteAsync(logEntry);
    }

    public List<LogEntry> GetRecentLogs(int count = 1000)
    {
        return _logBuffer
            .TakeLast(Math.Min(count, MaxBufferSize))
            .ToList();
    }

    public void ClearBuffer()
    {
        while (_logBuffer.TryDequeue(out _)) { }
    }

    private async Task ProcessLogsAsync(CancellationToken cancellationToken)
    {
        var batch = new List<LogEntry>();
        const int maxBatchSize = 50;
        const int batchDelayMs = 100; // Collect logs for 100ms before sending
            
        try
        {
            await foreach (var log in _logChannel.Reader.ReadAllAsync(cancellationToken))
            {
                batch.Add(log);

                switch (batch.Count)
                {
                    // Send batch if size limit reached or wait for timeout
                    case >= maxBatchSize:
                        await SendBatchAsync(batch);
                        batch.Clear();
                        break;
                    default:
                    {
                        // Wait a bit for more logs to batch together
                        await Task.Delay(batchDelayMs, cancellationToken);
                        
                        // Send whatever we have collected
                        if (batch.Count != 0)
                        {
                            await SendBatchAsync(batch);
                            batch.Clear();
                        }

                        break;
                    }
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Expected when disposing
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in log processing task");
        }
    }

    private async Task SendBatchAsync(List<LogEntry> logs)
    {
        try
        {
            // Broadcast to all connected admin clients
            await _hubContext.Clients.All.SendAsync("ReceiveLogs", logs);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to broadcast logs via SignalR: {ex.Message}");
        }
    }

    public void Dispose()
    {
        _cancellationTokenSource.Cancel();
        _logChannel.Writer.Complete();
        _processingTask.Wait(TimeSpan.FromSeconds(5));
        _cancellationTokenSource.Dispose();
    }
}
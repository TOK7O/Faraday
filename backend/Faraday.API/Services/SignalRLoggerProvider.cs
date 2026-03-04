using Faraday.API.Models;
using Faraday.API.Services.Interfaces;

namespace Faraday.API.Services;

/// <summary>
/// Provider required by the logging infrastructure creating instances of the custom SignalR logger.
/// This allows the application to inject the real-time logging capability into the standard .NET logging pipeline.
/// </summary>
public class SignalRLoggerProvider(IServiceProvider serviceProvider, LogLevel minLevel = LogLevel.Information)
    : ILoggerProvider
{
    public ILogger CreateLogger(string categoryName)
    {
        return new SignalRLogger(categoryName, serviceProvider, minLevel);
    }

    public void Dispose() { }
}

/// <summary>
/// Custom logger implementation that intercepts log messages and broadcasts them in real-time 
/// to connected clients via SignalR. 
/// Meant for live console monitoring on the frontend.
/// </summary>
public class SignalRLogger(string categoryName, IServiceProvider serviceProvider, LogLevel minLevel)
    : ILogger
{
    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

    public bool IsEnabled(LogLevel logLevel) => logLevel >= minLevel;

    public void Log<TState>(
        LogLevel logLevel,
        EventId eventId,
        TState state,
        Exception? exception,
        Func<TState, Exception?, string> formatter)
    {
        if (!IsEnabled(logLevel))
            return;

        var logEntry = new LogEntry
        {
            Timestamp = DateTime.UtcNow,
            Level = logLevel.ToString(),
            Category = categoryName,
            Message = formatter(state, exception),
            Exception = exception?.ToString(),
            EventId = eventId.Id
        };

        // Fire and forget strategy:
        // We offload the broadcasting to a background thread to ensure that the logging operation 
        // is non-blocking and does not impact the performance of the main request processing pipeline.
        Task.Run(async () =>
        {
            try
            {
                using var scope = serviceProvider.CreateScope();
                var logsService = scope.ServiceProvider.GetService<ILogsService>();
            
                if (logsService != null)
                {
                    await logsService.BroadcastLogAsync(logEntry);
                }
            }
            catch
            {
                // Critical safety measure here!: We strictly suppress all exceptions here.
                // If the logging service itself fails (e.g., SignalR is down), we cannot "log" that error 
                // using this same logger, as it would trigger an infinite recursion loop (StackOverflow) 
                // and crash the application.
            }
        });
    }
}
using Faraday.API.Models;
using Faraday.API.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace Faraday.API.Services
{
    /// <summary>
    /// Provider required by the logging infrastructure to create instances of the custom SignalR logger.
    /// This allows the application to inject the real-time logging capability into the standard .NET logging pipeline.
    /// </summary>
    public class SignalRLoggerProvider : ILoggerProvider
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly LogLevel _minLevel;

        public SignalRLoggerProvider(IServiceProvider serviceProvider, LogLevel minLevel = LogLevel.Information)
        {
            _serviceProvider = serviceProvider;
            _minLevel = minLevel;
        }

        public ILogger CreateLogger(string categoryName)
        {
            return new SignalRLogger(categoryName, _serviceProvider, _minLevel);
        }

        public void Dispose() { }
    }

    /// <summary>
    /// Custom logger implementation that intercepts log messages and broadcasts them in real-time 
    /// to connected clients via SignalR. 
    /// Meant for live console monitoring on the frontend.
    /// </summary>
    public class SignalRLogger : ILogger
    {
        private readonly string _categoryName;
        private readonly IServiceProvider _serviceProvider;
        private readonly LogLevel _minLevel;

        public SignalRLogger(string categoryName, IServiceProvider serviceProvider, LogLevel minLevel)
        {
            _categoryName = categoryName;
            _serviceProvider = serviceProvider;
            _minLevel = minLevel;
        }

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => logLevel >= _minLevel;

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
                Category = _categoryName,
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
                    using var scope = _serviceProvider.CreateScope();
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
}
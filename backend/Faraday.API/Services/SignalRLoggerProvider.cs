using Faraday.API.Models;
using Faraday.API.Services.Interfaces;
using Microsoft.Extensions.Options;

namespace Faraday.API.Services
{
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

            // Fire and forget - use background task to avoid blocking logging pipeline
            Task.Run(async () =>
            {
                try
                {
                    // Create scope for each log to get fresh service instance
                    using var scope = _serviceProvider.CreateScope();
                    var logsService = scope.ServiceProvider.GetService<ILogsService>();
            
                    if (logsService != null)
                    {
                        await logsService.BroadcastLogAsync(logEntry);
                    }
                }
                catch
                {
                    // Suppress errors to avoid logging loop
                }
            });
        }
    }
}
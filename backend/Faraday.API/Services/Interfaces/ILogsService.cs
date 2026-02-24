using Faraday.API.Models;

namespace Faraday.API.Services.Interfaces;

public interface ILogsService
{
    /// <summary>
    /// Sends a log entry to all connected clients via SignalR with throttling support.
    /// </summary>
    Task BroadcastLogAsync(LogEntry logEntry);
        
    /// <summary>
    /// Returns the last N log entries from the in-memory buffer.
    /// </summary>
    List<LogEntry> GetRecentLogs(int count = 1000);
        
    /// <summary>
    /// Clears the in-memory log buffer.
    /// </summary>
    void ClearBuffer();
}
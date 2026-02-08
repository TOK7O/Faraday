namespace Faraday.API.DTOs
{
    public class BackupHistoryDto
    {
        public string FileName { get; set; } = string.Empty;
        public long SizeBytes { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}

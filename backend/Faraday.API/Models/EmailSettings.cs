namespace Faraday.API.Models
{
    public class EmailSettings
    {
        public string SMTP_SERVER { get; set; } = null!;
        public int SMTP_PORT { get; set; }
        public string SMTP_EMAIL { get; set; } = null!;
        public string SMTP_PASSWORD { get; set; } = null!;
        public string SMTP_NAME { get; set; } = null!;
    }
}
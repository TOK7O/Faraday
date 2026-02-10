namespace Faraday.API.Services.Interfaces
{
    public interface IEmailService
    {
        /// <summary>
        /// Asynchronously sends a password reset email to the specified recipient.
        /// </summary>
        Task SendPasswordResetEmailAsync(string toEmail, string resetLink);
    }
}
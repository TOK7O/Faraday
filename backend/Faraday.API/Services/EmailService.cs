using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Microsoft.Extensions.Options;
using Faraday.API.Models;
using Faraday.API.Services.Interfaces;

namespace Faraday.API.Services
{
    /// <summary>
    /// Service responsible for handling outgoing email communications.
    /// Uses MailKit implementation.
    /// </summary>
    public class EmailService : IEmailService
    {
        private readonly EmailSettings _settings;
        private readonly ILogger<EmailService> _logger;

        public EmailService(
            IOptions<EmailSettings> settings,
            ILogger<EmailService> logger)
        {
            _settings = settings.Value;
            _logger = logger;
        }

        /// <summary>
        /// Generates and sends a password reset email containing a time-sensitive link.
        /// </summary>
        /// <param name="toEmail">The recipient's email address.</param>
        /// <param name="resetLink">The full URL (including token) for the password reset action.</param>
        /// <exception cref="Exception">Propagates SMTP or network exceptions after logging them.</exception>
        public async Task SendPasswordResetEmailAsync(string toEmail, string resetLink)
        {
            try
            {
                _logger.LogInformation("Sending password reset email to: {Email}", toEmail);
                
                var email = new MimeMessage();
                email.From.Add(new MailboxAddress(_settings.SMTP_NAME, _settings.SMTP_EMAIL));
                email.To.Add(MailboxAddress.Parse(toEmail));
                email.Subject = "Resetowanie hasła - Faraday Systems";
                
                var builder = new BodyBuilder
                {
                    HtmlBody = $@"
                    <div style='font-family: Arial, sans-serif; padding: 20px; color: #333;'>
                        <h2>Witaj!</h2>
                        <p>Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w systemie Faraday.</p>
                        <p>Aby ustawić nowe hasło, kliknij w poniższy przycisk:</p>
                        <a href='{resetLink}' style='background-color: #12b8ce; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;'>Zresetuj Hasło</a>
                        <p>Link jest ważny przez 1 godzinę.</p>
                        <p>Jeśli to nie Ty wysłałeś prośbę, zignoruj tę wiadomość.</p>
                        <br>
                        <p style='font-size: 12px; color: #999;'>Link do skopiowania: {resetLink}</p>
                    </div>"
                };

                email.Body = builder.ToMessageBody();
                
                using var smtp = new SmtpClient();
                
                // SecureSocketOptions.StartTls upgrades the connection to TLS immediately after connecting
                await smtp.ConnectAsync(_settings.SMTP_SERVER, _settings.SMTP_PORT, SecureSocketOptions.StartTls);
                
                await smtp.AuthenticateAsync(_settings.SMTP_EMAIL, _settings.SMTP_PASSWORD);
                await smtp.SendAsync(email);
                
                // True indicates we are sending the QUIT command to the server
                await smtp.DisconnectAsync(true);
                
                _logger.LogInformation("Password reset email sent successfully to: {Email}", toEmail);
            }
            catch (Exception ex)
            {
                // We log the error here to capture the context (email address), 
                // but we re-throw to ensure the controller knows the operation failed.
                _logger.LogError(ex, "Failed to send password reset email to: {Email}. Error: {ErrorMessage}", 
                    toEmail, ex.Message);
                throw;
            }
        }
    }
}
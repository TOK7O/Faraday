using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Microsoft.Extensions.Options;
using Faraday.API.Models;
using Faraday.API.Services.Interfaces;

namespace Faraday.API.Services
{
    public class EmailService : IEmailService
    {
        private readonly EmailSettings _settings;

        public EmailService(IOptions<EmailSettings> settings)
        {
            _settings = settings.Value;
        }

        public async Task SendPasswordResetEmailAsync(string toEmail, string resetLink)
        {
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
            await smtp.ConnectAsync(_settings.SMTP_SERVER, _settings.SMTP_PORT, SecureSocketOptions.StartTls);
            await smtp.AuthenticateAsync(_settings.SMTP_EMAIL, _settings.SMTP_PASSWORD);
            await smtp.SendAsync(email);
            await smtp.DisconnectAsync(true);
        }
    }
}

using Microsoft.Extensions.Configuration;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using MyApp.Application.Interfaces;

namespace MyApp.Infrastructure.Notifications
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;

        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public Task SendEmailAsync(string toEmail, string subject, string body) =>
            SendEmailAsync(toEmail, subject, body, null);

        public async Task SendEmailAsync(string toEmail, string subject, string plainBody, string? htmlBody)
        {
            // Fail fast with a clear message when mail settings are missing,
            // instead of a NullReference deep inside MailKit. This also
            // resolves the CS8604 nullable warnings at these call sites.
            var senderName = _configuration["Email:SenderName"] ?? "School Alumni Portal";
            var senderEmail = _configuration["Email:SenderEmail"]
                ?? throw new InvalidOperationException("Email:SenderEmail is not configured.");
            var smtpHost = _configuration["Email:SmtpHost"]
                ?? throw new InvalidOperationException("Email:SmtpHost is not configured.");
            var smtpPort = int.TryParse(_configuration["Email:SmtpPort"], out var port)
                ? port
                : throw new InvalidOperationException("Email:SmtpPort is missing or not a number.");
            var senderPassword = _configuration["Email:SenderPassword"]
                ?? throw new InvalidOperationException("Email:SenderPassword is not configured.");

            try
            {
                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(senderName, senderEmail));
                message.To.Add(MailboxAddress.Parse(toEmail));
                message.Subject = subject;

                if (string.IsNullOrWhiteSpace(htmlBody))
                {
                    message.Body = new TextPart("plain") { Text = plainBody };
                }
                else
                {
                    var alternative = new Multipart("alternative");
                    alternative.Add(new TextPart("plain") { Text = plainBody });
                    alternative.Add(new TextPart("html") { Text = htmlBody });
                    message.Body = alternative;
                }

                using var client = new SmtpClient();
                await client.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls);

                await client.AuthenticateAsync(senderEmail, senderPassword);

                await client.SendAsync(message);
                await client.DisconnectAsync(true);
            }
            catch (Exception ex)
            {
                // Don't crash the app if email fails — just log it
                Console.WriteLine($"Email failed to send: {ex.Message}");
            }
        }
    }
}
using Microsoft.Extensions.Configuration;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using MyApp.Application.Interfaces;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace MyApp.Infrastructure.Notifications
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;

        public EmailService(IConfiguration configuration, HttpClient httpClient)
        {
            _configuration = configuration;
            _httpClient = httpClient;
        }

        public Task SendEmailAsync(string toEmail, string subject, string body) =>
            SendEmailAsync(toEmail, subject, body, null);

        public async Task SendEmailAsync(string toEmail, string subject, string plainBody, string? htmlBody)
        {
            try
            {
                var provider = _configuration["Email:Provider"] ?? "Smtp";
                if (provider.Equals("Resend", StringComparison.OrdinalIgnoreCase))
                {
                    await SendWithResendAsync(toEmail, subject, plainBody, htmlBody);
                }
                else if (provider.Equals("Smtp", StringComparison.OrdinalIgnoreCase))
                {
                    await SendWithSmtpAsync(toEmail, subject, plainBody, htmlBody);
                }
                else
                {
                    throw new InvalidOperationException(
                        $"Unsupported Email:Provider '{provider}'. Use Smtp or Resend.");
                }
            }
            catch (Exception ex)
            {
                // Don't crash the app if email fails — just log it
                Console.WriteLine($"Email failed to send: {ex.Message}");
            }
        }

        private async Task SendWithResendAsync(
            string toEmail,
            string subject,
            string plainBody,
            string? htmlBody)
        {
            // Railway blocks outbound SMTP on Free, Trial, and Hobby. Resend's
            // HTTPS API keeps invitations and password resets working there.
            var apiKey = _configuration["Email:ApiKey"]
                ?? throw new InvalidOperationException("Email:ApiKey is not configured for Resend.");
            var senderName = _configuration["Email:SenderName"] ?? "School Alumni Portal";
            var senderEmail = _configuration["Email:SenderEmail"]
                ?? throw new InvalidOperationException("Email:SenderEmail is not configured.");
            var apiUrl = _configuration["Email:ApiUrl"] ?? "https://api.resend.com/emails";

            var payload = new Dictionary<string, object>
            {
                ["from"] = $"{senderName} <{senderEmail}>",
                ["to"] = new[] { toEmail },
                ["subject"] = subject,
                ["text"] = plainBody
            };
            if (!string.IsNullOrWhiteSpace(htmlBody))
                payload["html"] = htmlBody;

            using var request = new HttpRequestMessage(HttpMethod.Post, apiUrl)
            {
                Content = JsonContent.Create(payload)
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            using var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var detail = await response.Content.ReadAsStringAsync();
                if (detail.Length > 500) detail = detail[..500];
                throw new InvalidOperationException(
                    $"Resend returned {(int)response.StatusCode}: {detail}");
            }
        }

        private async Task SendWithSmtpAsync(
            string toEmail,
            string subject,
            string plainBody,
            string? htmlBody)
        {
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
    }
}

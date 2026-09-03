using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using MyApp.Application.Interfaces;

namespace MyApp.Infrastructure.Services
{
    public class PushService : IPushService
    {
        private const string ExpoPushEndpoint = "https://exp.host/--/api/v2/push/send";
        private const int ChunkSize = 100;
        private readonly HttpClient _httpClient;
        private readonly ILogger<PushService> _logger;

        public PushService(HttpClient httpClient, ILogger<PushService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task SendAsync(IReadOnlyCollection<string> tokens, string title, string body, string type, int? relatedId)
        {
            if (tokens.Count == 0) return;

            var payload = tokens.Select(t => new
            {
                to = t,
                title,
                body,
                sound = "default",
                channelId = "default",
                data = new { type, relatedId }
            }).ToList();

            // Expo accepts up to 100 messages per request.
            for (var i = 0; i < payload.Count; i += ChunkSize)
            {
                var chunk = payload.Skip(i).Take(ChunkSize).ToList();
                try
                {
                    using var response = await _httpClient.PostAsJsonAsync(ExpoPushEndpoint, chunk);
                    if (!response.IsSuccessStatusCode)
                    {
                        var errorText = await response.Content.ReadAsStringAsync();
                        _logger.LogWarning("Expo push failed ({Status}): {Error}", response.StatusCode, errorText);
                    }
                }
                catch (Exception ex)
                {
                    // Push must never break the main flow (status update, etc.)
                    _logger.LogError(ex, "Expo push request failed");
                }
            }
        }
    }
}

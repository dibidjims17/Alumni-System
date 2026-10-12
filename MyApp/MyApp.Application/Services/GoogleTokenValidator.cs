using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace MyApp.Application.Services
{
    /// <summary>
    /// Verifies a Google ID token via Google's tokeninfo endpoint and returns
    /// the verified email + subject. No extra NuGet needed (plain HttpClient).
    /// Backend trusts ONLY tokens whose `aud` matches a configured client id
    /// and whose email is verified by Google.
    /// </summary>
    public class GoogleTokenValidator
    {
        private readonly HttpClient _http;
        private readonly IConfiguration _configuration;

        public record ValidatedGoogleUser(string Email, string Subject);

        public GoogleTokenValidator(HttpClient http, IConfiguration configuration)
        {
            _http = http;
            _configuration = configuration;
        }

        public HashSet<string> GetAllowedClientIds()
        {
            var ids = new HashSet<string>(StringComparer.Ordinal);
            // Support single value, WebClientId alias, and list forms so mobile
            // (Android) + web (Vite admin) can share one Web client id or use
            // separate ids without code changes.
            foreach (var key in new[] { "Google:ClientId", "Google:WebClientId", "Google:AndroidClientId" })
            {
                var v = _configuration[key];
                if (!string.IsNullOrWhiteSpace(v)) ids.Add(v.Trim());
            }
            // "Google:ClientIds": ["id1", "id2"]
            _configuration.GetSection("Google:ClientIds").GetChildren()
                .Select(c => c.Value?.Trim())
                .Where(v => !string.IsNullOrWhiteSpace(v))
                .ToList().ForEach(v => ids.Add(v!));
            return ids;
        }

        public async Task<ValidatedGoogleUser?> ValidateAsync(string idToken)
        {
            if (string.IsNullOrWhiteSpace(idToken)) return null;

            var allowed = GetAllowedClientIds();
            if (allowed.Count == 0) return null; // not configured

            HttpResponseMessage res;
            try
            {
                res = await _http.GetAsync(
                    $"https://oauth2.googleapis.com/tokeninfo?id_token={Uri.EscapeDataString(idToken)}");
            }
            catch
            {
                return null;
            }
            if (!res.IsSuccessStatusCode) return null;

            JsonDocument doc;
            try
            {
                var json = await res.Content.ReadAsStringAsync();
                doc = JsonDocument.Parse(json);
            }
            catch
            {
                return null;
            }
            using (doc)
            {
                var root = doc.RootElement;
                if (!root.TryGetProperty("aud", out var audProp)) return null;
                if (!root.TryGetProperty("email", out var emailProp)) return null;
                var aud = audProp.GetString();
                var email = emailProp.GetString();
                if (string.IsNullOrWhiteSpace(aud) || string.IsNullOrWhiteSpace(email)) return null;
                if (!allowed.Contains(aud)) return null;

                // email_verified must be "true"
                if (root.TryGetProperty("email_verified", out var verifiedProp))
                {
                    var verified = verifiedProp.GetString();
                    if (!string.Equals(verified, "true", StringComparison.OrdinalIgnoreCase))
                        return null;
                }

                // exp check (seconds since epoch)
                if (root.TryGetProperty("exp", out var expProp) &&
                    long.TryParse(expProp.GetString(), out var expSecs))
                {
                    if (DateTimeOffset.FromUnixTimeSeconds(expSecs) < DateTimeOffset.UtcNow)
                        return null;
                }

                root.TryGetProperty("sub", out var subProp);
                return new ValidatedGoogleUser(email.Trim(), subProp.GetString() ?? string.Empty);
            }
        }
    }
}

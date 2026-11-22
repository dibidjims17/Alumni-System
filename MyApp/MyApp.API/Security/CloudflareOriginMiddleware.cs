using System.Net;
using System.Security.Cryptography;
using System.Text;

namespace MyApp.API.Security
{
    /// <summary>
    /// Optional origin gate for the Cloudflare Worker in /cloudflare.
    /// When enabled, public traffic must carry a secret that only the Worker
    /// and API know. This prevents clients from bypassing Cloudflare by using
    /// the Railway/Render origin URL directly. The same trusted hop supplies
    /// the real client IP used by rate limiting and audit logs.
    /// </summary>
    public sealed class CloudflareOriginMiddleware
    {
        public const string OriginSecretHeader = "X-Reunio-Origin-Secret";
        public const string ClientIpHeader = "X-Reunio-Client-IP";
        public const string ForwardedProtoHeader = "X-Reunio-Forwarded-Proto";

        private readonly RequestDelegate _next;
        private readonly CloudflareOriginOptions _options;
        private readonly byte[]? _expectedSecretHash;

        public CloudflareOriginMiddleware(
            RequestDelegate next,
            CloudflareOriginOptions options)
        {
            _next = next;
            _options = options;

            if (Encoding.UTF8.GetByteCount(_options.OriginSecret) >= 32)
            {
                _expectedSecretHash = SHA256.HashData(
                    Encoding.UTF8.GetBytes(_options.OriginSecret));
            }
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Hosting-provider liveness probes must be able to reach this one
            // non-sensitive endpoint without passing through the Worker.
            if (string.Equals(
                    context.Request.Path.Value,
                    "/health",
                    StringComparison.OrdinalIgnoreCase))
            {
                await _next(context);
                return;
            }

            var suppliedSecret = context.Request.Headers[OriginSecretHeader].ToString();
            var isTrustedGateway = SecretMatches(suppliedSecret);
            if (_options.RequireOriginSecret && !isTrustedGateway)
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/problem+json";
                await context.Response.WriteAsJsonAsync(new
                {
                    type = "https://httpstatuses.com/403",
                    title = "Forbidden",
                    status = StatusCodes.Status403Forbidden
                });
                return;
            }

            if (isTrustedGateway)
            {
                // These forwarding headers are trusted only after the secret
                // has passed a constant-time comparison. Never trust arbitrary
                // CF-Connecting-IP/X-Forwarded-For headers from direct clients.
                var clientIp = context.Request.Headers[ClientIpHeader].ToString();
                if (IPAddress.TryParse(clientIp, out var parsedIp))
                    context.Connection.RemoteIpAddress = parsedIp;

                var forwardedProto = context.Request.Headers[ForwardedProtoHeader].ToString();
                if (string.Equals(forwardedProto, "https", StringComparison.OrdinalIgnoreCase))
                    context.Request.Scheme = "https";
            }

            // Do not make the shared secret available to controllers or other
            // downstream middleware that might log request headers.
            context.Request.Headers.Remove(OriginSecretHeader);
            context.Request.Headers.Remove(ClientIpHeader);
            context.Request.Headers.Remove(ForwardedProtoHeader);

            await _next(context);
        }

        private bool SecretMatches(string suppliedSecret)
        {
            if (_expectedSecretHash == null || string.IsNullOrEmpty(suppliedSecret))
                return false;

            var suppliedHash = SHA256.HashData(Encoding.UTF8.GetBytes(suppliedSecret));
            return CryptographicOperations.FixedTimeEquals(
                _expectedSecretHash,
                suppliedHash);
        }
    }
}

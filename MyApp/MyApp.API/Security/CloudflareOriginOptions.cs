namespace MyApp.API.Security
{
    public sealed class CloudflareOriginOptions
    {
        public const string SectionName = "Cloudflare";

        // Keep false for local development. In production, turn this on only
        // after the Worker gateway and its matching secret are deployed.
        public bool RequireOriginSecret { get; set; }

        // Supply through Cloudflare__OriginSecret, never a committed file.
        public string OriginSecret { get; set; } = string.Empty;
    }
}

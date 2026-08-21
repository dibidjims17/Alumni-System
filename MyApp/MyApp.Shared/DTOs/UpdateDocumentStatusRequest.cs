namespace MyApp.Shared.DTOs
{
    public class UpdateDocumentStatusRequest
    {
        public string Status { get; set; } = "Pending"; // "Pending" or "Released"
        public string? Notes { get; set; }
    }
}
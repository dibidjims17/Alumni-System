namespace MyApp.Shared.DTOs
{
    public class ImportDocumentDto
    {
        public string StudentNumber { get; set; } = string.Empty;
        public string DocumentType { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty; // "Released" or "Pending"
        public string? Notes { get; set; }
    }
}
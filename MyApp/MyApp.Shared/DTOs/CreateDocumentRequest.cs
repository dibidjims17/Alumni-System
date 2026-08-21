namespace MyApp.Shared.DTOs
{
    public class CreateDocumentRequest
    {
        public string DocumentType { get; set; } = string.Empty;
        public string? CustomLabel { get; set; }
    }
}
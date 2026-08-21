namespace MyApp.Shared.DTOs
{
    public class AlumniDocumentDto
    {
        public int Id { get; set; }
        public string DocumentType { get; set; } = string.Empty;
        public string? CustomLabel { get; set; }
        public string DisplayName => DocumentType == "Others" ? CustomLabel ?? "Others" : DocumentType;
        public string Status { get; set; } = "Pending";
        public string? Notes { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
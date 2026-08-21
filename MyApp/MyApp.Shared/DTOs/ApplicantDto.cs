namespace MyApp.Shared.DTOs
{
    public class ApplicantDto
    {
        public int ApplicationId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string StudentNumber { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Program { get; set; } = string.Empty;
        public DateTime AppliedAt { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool AttachResume { get; set; }
        public int? ResumeId { get; set; }
        public string? ResumeFileName { get; set; }
        public string AdminNotes { get; set; } = string.Empty;
    }
}
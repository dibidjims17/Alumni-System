namespace MyApp.Shared.DTOs
{
    public class StudentDto
    {
        public int Id { get; set; }
        public string StudentNumber { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Program { get; set; } = string.Empty;
        public string SchoolYear { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ActivatedAt { get; set; }
        // Claimed = logged in at least once (or already past the
        // temp-password gate). Rule lives here so every client agrees.
        public bool IsClaimed { get; set; }
        public string? ProfilePicturePath { get; set; }
        // Populated only on creation responses so the admin can relay it.
        public string? TemporaryPassword { get; set; }
        public bool InviteEmailSent { get; set; }
        public CareerSummaryDto? Career { get; set; }
        public bool CareerReminderActive { get; set; }
        public DateTime? CareerReminderSentAt { get; set; }
        public string? CareerReminderType { get; set; }
    }

    // Lightweight newest-career-record projection used by the alumni
    // directory. Proof paths and review notes intentionally stay out.
    public class CareerSummaryDto
    {
        public int RecordId { get; set; }
        public string EmploymentStatus { get; set; } = string.Empty;
        public string? JobTitle { get; set; }
        public string? Company { get; set; }
        public string? Industry { get; set; }
        public string ReviewStatus { get; set; } = string.Empty;
        public string? CourseAlignment { get; set; }
        public bool IsVerified { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}

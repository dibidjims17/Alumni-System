namespace MyApp.Domain.Entities
{
    // An alumni's self-declared career status plus the documents that prove
    // it (certificate of employment + work ID). One row per submission; a
    // student re-submitting after a rejection adds a new row so the review
    // history is preserved. The newest row is the student's current record.
    public class CareerRecord
    {
        public int Id { get; set; }
        public int StudentId { get; set; }

        // Employed | Self-Employed | Unemployed | Further Studies
        public string EmploymentStatus { get; set; } = string.Empty;
        public string? JobTitle { get; set; }
        public string? Company { get; set; }
        public string? Industry { get; set; }
        public DateTime? DateStarted { get; set; }

        // Relative paths under Uploads/CareerProofs/, served as static files.
        public string CertificatePath { get; set; } = string.Empty;
        public string CertificateFileName { get; set; } = string.Empty;
        public string WorkIdPath { get; set; } = string.Empty;
        public string WorkIdFileName { get; set; } = string.Empty;

        // Pending | Approved | Rejected
        public string Status { get; set; } = "Pending";
        public string? ReviewNote { get; set; }
        public int? ReviewedByAdminId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ReviewedAt { get; set; }

        public Student Student { get; set; } = null!;
        public Admin? ReviewedByAdmin { get; set; }
    }
}

namespace MyApp.Shared.DTOs
{
    // Returned to both the student (their own record) and the admin (queue).
    // File paths are relative ("Uploads/CareerProofs/..."); clients prepend
    // the API host exactly like they do for ProfilePictureUrl.
    public class CareerRecordDto
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string? StudentName { get; set; }
        public string? StudentNumber { get; set; }
        public string? Program { get; set; }
        public string? SchoolYear { get; set; }

        public string EmploymentStatus { get; set; } = string.Empty;
        public string? JobTitle { get; set; }
        public string? Company { get; set; }
        public string? Industry { get; set; }
        public DateTime? DateStarted { get; set; }

        public string CertificatePath { get; set; } = string.Empty;
        public string CertificateFileName { get; set; } = string.Empty;
        public string WorkIdPath { get; set; } = string.Empty;
        public string WorkIdFileName { get; set; } = string.Empty;

        public string Status { get; set; } = "Pending";
        public string? ReviewNote { get; set; }
        public string? ReviewedByAdminName { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }
    }

    // Path fields are filled in by the controller once both files have been
    // validated and written to disk; clients never send them.
    public class CareerSubmitRequest
    {
        public string EmploymentStatus { get; set; } = string.Empty;
        public string? JobTitle { get; set; }
        public string? Company { get; set; }
        public string? Industry { get; set; }
        public DateTime? DateStarted { get; set; }

        public string CertificatePath { get; set; } = string.Empty;
        public string CertificateFileName { get; set; } = string.Empty;
        public string WorkIdPath { get; set; } = string.Empty;
        public string WorkIdFileName { get; set; } = string.Empty;
    }

    public class CareerReviewRequest
    {
        // "Approved" | "Rejected"
        public string Status { get; set; } = string.Empty;
        public string? Note { get; set; }
    }

    // Counts are based on each student's newest record so a re-submission
    // never double-counts them.
    public class CareerStatsDto
    {
        public int TotalGraduates { get; set; }
        public int Submitted { get; set; }
        public int Pending { get; set; }
        public int Approved { get; set; }
        public int Rejected { get; set; }
        public int Employed { get; set; }
        public int SelfEmployed { get; set; }
        public int Unemployed { get; set; }
        public int FurtherStudies { get; set; }
    }
}

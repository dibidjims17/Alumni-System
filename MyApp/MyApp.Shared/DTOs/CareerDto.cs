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
        public string? CourseAlignment { get; set; }
        public string SuggestedCourseAlignment { get; set; } = "Needs Review";
        public string AlignmentSuggestionReason { get; set; } = string.Empty;

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
        public string? CourseAlignment { get; set; }
    }

    // Month-scoped report (registrar deliverable): everything about the
    // submissions received in one calendar month, plus the rows behind the
    // numbers so the screen can render a table and the CSV can match it.
    public class CareerReportDto
    {
        // "2026-11" / "November 2026"
        public string Month { get; set; } = string.Empty;
        public string MonthLabel { get; set; } = string.Empty;

        // Submissions with CreatedAt inside the month.
        public int Submitted { get; set; }
        public int Approved { get; set; }
        public int Pending { get; set; }
        public int Rejected { get; set; }

        // Reviews completed during the month regardless of when the record
        // was submitted — the registrar's processing workload for the month.
        public int ReviewedThisMonth { get; set; }

        // Ordered {label,count} lists, zero-count options omitted (same
        // convention as the tracer stats). Employment/alignment cover the
        // month's submissions; programs are the programs represented.
        public List<TracerCountItemDto> ByEmployment { get; set; } = new();
        public List<TracerCountItemDto> ByAlignment { get; set; } = new();
        public List<TracerCountItemDto> ByProgram { get; set; } = new();

        // The month's records, newest first — table + CSV share these rows.
        public List<CareerRecordDto> Rows { get; set; } = new();
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
        public int Aligned { get; set; }
        public int Related { get; set; }
        public int NotAligned { get; set; }
        public int NotApplicable { get; set; }
        public int Unassessed { get; set; }
        public int AlignmentRate { get; set; }
    }
}

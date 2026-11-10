namespace MyApp.Shared.DTOs
{
    // GET /api/Tracer/status — what the mobile gate reads on login.
    public class TracerStatusDto
    {
        // True once submitted (and always true for non-graduates, who are
        // not tracer respondents — they pass the gate without answering).
        public bool Completed { get; set; }

        // Only graduates must answer; current students never see the gate.
        public bool Required { get; set; }

        // 1..5 — which step to resume at (0 when no draft exists).
        public int CurrentStep { get; set; }
        public bool HasDraft { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
    }

    // The full answer set. The client holds all answers in memory and sends
    // the complete object on every PUT draft (overwrite semantics), so a
    // partial save can never leave stale values behind.
    public class TracerAnswersDto
    {
        // Where the respondent should resume (1..5).
        public int CurrentStep { get; set; } = 1;

        // A. Graduate profile
        public string? Sex { get; set; }
        public string? ContactNo { get; set; }
        public string? EmailOrFb { get; set; }
        public string? PresentAddress { get; set; }

        // B. Employment status (branch point)
        public string? EmploymentStatus { get; set; }

        // C. Current employment details (employed respondents only)
        public string? CompanyName { get; set; }
        public string? Position { get; set; }
        public string? CompanyType { get; set; }
        public string? CompanyTypeOther { get; set; }
        public string? SalaryBand { get; set; }
        public string? MonthsToJob { get; set; }
        public string? JobSource { get; set; }

        // D. Alignment to course
        public string? CourseRelatedness { get; set; }
        public string? CourseRelatednessComment { get; set; }
        public string? SkillsUsed { get; set; }
        public string? SkillsUsedOther { get; set; }
        public string? SkillsWanted { get; set; }

        // E. Feedback
        public string? Satisfied { get; set; }
        public string? SatisfiedReason { get; set; }
        public string? WouldRecommend { get; set; }

        // Read-only on responses (GET draft / GET me).
        public bool Completed { get; set; }
        public DateTime? SubmittedAt { get; set; }
    }
}

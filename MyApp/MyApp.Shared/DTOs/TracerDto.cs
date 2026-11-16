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

    // ------------------------------------------------------------------
    // Admin reporting (P3) — SuperAdmin + Staff read-only.
    // ------------------------------------------------------------------

    // One row of the admin responses table. Student fields are joined at
    // report time; the full answer set ships in the CSV export.
    public class TracerResponseRowDto
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string StudentNumber { get; set; } = string.Empty;
        public string Program { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Status { get; set; } = "Draft";
        public int CurrentStep { get; set; }
        public string? EmploymentStatus { get; set; }
        public string? CourseRelatedness { get; set; }
        public string? CompanyName { get; set; }
        public string? Position { get; set; }
        public string? SalaryBand { get; set; }
        public string? Satisfied { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    // Stats cards + distributions for the Tracer Study screen. The
    // distributions cover SUBMITTED responses only (drafts are incomplete);
    // DraftsByStep feeds the completion funnel / pending-draft view.
    public class TracerAdminStatsDto
    {
        // Response-rate denominator: registered, active graduates.
        public int TotalGraduates { get; set; }
        public int Submitted { get; set; }
        public int Drafts { get; set; }

        // 0..100 — submitted vs. registered graduates.
        public double ResponseRate { get; set; }

        // "1".."5" -> draft count parked at that step (drop-off funnel).
        // Ordered {label,count} list — not a Dictionary: ASP.NET Web defaults
        // camelCase dictionary keys, which would mangle option labels
        // ("OJT Experience" -> "ojT Experience").
        public List<TracerCountItemDto> DraftsByStep { get; set; } = new();

        // Employed (any of the three employed statuses).
        public int EmployedCount { get; set; }

        // Course alignment: Highly Related + Related over answered rows.
        public int RelatednessAnswers { get; set; }
        public int CourseRelatedCount { get; set; }

        public int SatisfiedYes { get; set; }
        public int RecommendYes { get; set; }

        // Distributions in questionnaire order (not alphabetical) so the
        // charts read top-to-bottom exactly like the paper form. Ordered
        // lists, zero-count options omitted — see DraftsByStep note for why
        // these are not dictionaries.
        public List<TracerCountItemDto> Employment { get; set; } = new();
        public List<TracerCountItemDto> Relatedness { get; set; } = new();
        public List<TracerCountItemDto> Salary { get; set; } = new();

        // Skills frequency, highest first — "skills the school should teach".
        public List<TracerCountItemDto> TopSkills { get; set; } = new();

        // Filter options: distinct programs among registered graduates.
        public List<string> Programs { get; set; } = new();
    }

    // One labeled count row for the report distributions.
    public class TracerCountItemDto
    {
        public string Label { get; set; } = string.Empty;
        public int Count { get; set; }
    }
}

namespace MyApp.Domain.Entities
{
    // Graduate Tracer Study response — the pre-screening questionnaire every
    // graduate must complete before using the app (school requirement). One
    // row per student (unique index): created as a Draft when the first step
    // is saved, flipped to Submitted on final submit. Section C stays null
    // when the Section B branch skips that step (unemployed / studying).
    // Free-text answers are stored as plain strings; multi-select fields
    // (SkillsUsed) hold comma-separated option labels.
    public class TracerResponse
    {
        public int Id { get; set; }
        public int StudentId { get; set; }

        // Draft | Submitted
        public string Status { get; set; } = "Draft";

        // 1..5 — resume pointer so an interrupted respondent continues
        // at the step they left.
        public int CurrentStep { get; set; } = 1;

        // A. Graduate profile — name / course / year live on the Student row
        // and are joined at report time, never duplicated here.
        // Sex: Male | Female
        public string? Sex { get; set; }
        public string? ContactNo { get; set; }
        public string? EmailOrFb { get; set; }
        public string? PresentAddress { get; set; }

        // B. Employment status (the branch point):
        // Employed (Full-time) | Employed (Part-time / Contractual) |
        // Self-Employed / Freelance | Unemployed (Looking for work) |
        // Unemployed (Not looking) | Currently Studying
        public string? EmploymentStatus { get; set; }

        // C. Current employment details — null when Section B skipped it.
        public string? CompanyName { get; set; }
        public string? Position { get; set; }
        // Govt | Private | BPO | School | Own Business | Others
        public string? CompanyType { get; set; }
        public string? CompanyTypeOther { get; set; }
        // Below 10k | 10k-15k | 15k-20k | 20k-30k | Above 30k
        public string? SalaryBand { get; set; }
        // <1 | 1-3 | 4-6 | 7-12 | >12 — months after graduation
        public string? MonthsToJob { get; set; }
        // Walk-in | Online | Referral | School Job Fair | OJT / Internship
        public string? JobSource { get; set; }

        // D. Alignment to course — the section the school cares about most.
        // Highly Related | Related | Somewhat Related | NOT Related
        // (null for unemployed respondents — they have no current job)
        public string? CourseRelatedness { get; set; }
        public string? CourseRelatednessComment { get; set; }
        // Comma-separated subset of: Major Subjects, Computer / Technical,
        // Communication, OJT Experience, Others
        public string? SkillsUsed { get; set; }
        public string? SkillsUsedOther { get; set; }
        public string? SkillsWanted { get; set; }

        // E. Feedback — Yes | No
        public string? Satisfied { get; set; }
        public string? SatisfiedReason { get; set; }
        public string? WouldRecommend { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? SubmittedAt { get; set; }

        public Student Student { get; set; } = null!;
    }
}

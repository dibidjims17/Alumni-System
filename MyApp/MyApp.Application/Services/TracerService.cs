using System.Text;
using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Shared.DTOs;

namespace MyApp.Application.Services
{
    public class TracerService : ITracerService
    {
        // Option sets straight from the paper questionnaire (Sections B–E).
        public static readonly List<string> EmploymentStatuses = new()
        {
            "Employed (Full-time)",
            "Employed (Part-time / Contractual)",
            "Self-Employed / Freelance",
            "Unemployed (Looking for work)",
            "Unemployed (Not looking)",
            "Currently Studying"
        };

        // Statuses that mean "has a job" — Section C and the job-related
        // parts of Section D are required for these, skipped for the rest.
        private static readonly List<string> EmployedStatuses = new()
        {
            "Employed (Full-time)",
            "Employed (Part-time / Contractual)",
            "Self-Employed / Freelance"
        };

        private static readonly List<string> Sexes = new() { "Male", "Female" };
        private static readonly List<string> CompanyTypes = new()
        {
            "Govt", "Private", "BPO", "School", "Own Business", "Others"
        };
        private static readonly List<string> SalaryBands = new()
        {
            "Below 10k", "10k-15k", "15k-20k", "20k-30k", "Above 30k"
        };
        private static readonly List<string> MonthsToJobOptions = new()
        {
            "<1", "1-3", "4-6", "7-12", ">12"
        };
        private static readonly List<string> JobSources = new()
        {
            "Walk-in", "Online", "Referral", "School Job Fair", "OJT / Internship"
        };
        private static readonly List<string> RelatednessOptions = new()
        {
            "Highly Related", "Related", "Somewhat Related", "NOT Related"
        };
        private static readonly List<string> SkillOptions = new()
        {
            "Major Subjects", "Computer / Technical", "Communication",
            "OJT Experience", "Others"
        };
        private static readonly List<string> YesNo = new() { "Yes", "No" };

        private readonly ITracerRepository _tracerRepository;
        private readonly IActivityLogRepository _activityLogRepository;
        private readonly IStudentRepository _studentRepository;

        public TracerService(
            ITracerRepository tracerRepository,
            IActivityLogRepository activityLogRepository,
            IStudentRepository studentRepository)
        {
            _tracerRepository = tracerRepository;
            _activityLogRepository = activityLogRepository;
            _studentRepository = studentRepository;
        }

        public async Task<TracerStatusDto> GetStatusAsync(int studentId, bool isGraduate)
        {
            var row = await _tracerRepository.GetByStudentAsync(studentId);
            var submitted = row?.Status == "Submitted";

            return new TracerStatusDto
            {
                // Non-graduates are not respondents — they pass the gate
                // without answering.
                Completed = !isGraduate || submitted,
                Required = isGraduate,
                CurrentStep = row?.CurrentStep ?? 0,
                HasDraft = row != null && !submitted,
                StartedAt = row?.CreatedAt,
                SubmittedAt = row?.SubmittedAt
            };
        }

        public async Task<TracerAnswersDto?> GetDraftAsync(int studentId)
        {
            var row = await _tracerRepository.GetByStudentAsync(studentId);
            return row == null ? null : Map(row);
        }

        public async Task<(bool Success, string Message)> SaveDraftAsync(
            int studentId, TracerAnswersDto answers, string ipAddress)
        {
            var row = await _tracerRepository.GetByStudentAsync(studentId);

            // No Submitted-lock here: a graduate re-opening the study to
            // edit (§8 Q2) saves steps as they go. ApplyAnswers never
            // touches Status, so a submitted row stays Submitted and the
            // gate remains open mid-edit — only the final submit bumps
            // SubmittedAt.
            if (row == null)
            {
                row = new TracerResponse { StudentId = studentId };
                ApplyAnswers(row, answers);
                await _tracerRepository.CreateAsync(row);
            }
            else
            {
                ApplyAnswers(row, answers);
                row.UpdatedAt = DateTime.UtcNow;
                await _tracerRepository.UpdateAsync(row);
            }

            return (true, "Draft saved.");
        }

        public async Task<(bool Success, string Message)> SubmitAsync(
            int studentId, TracerAnswersDto answers, string ipAddress)
        {
            var row = await _tracerRepository.GetByStudentAsync(studentId);
            // Editing after submit (§8 Q2): a second submit updates the
            // existing row instead of being rejected — SubmittedAt/UpdatedAt
            // move to now so reports show when the answers last changed.
            var isUpdate = row?.Status == "Submitted";

            var student = await _studentRepository.GetByIdAsync(studentId);
            if (student == null)
                return (false, "Student account not found.");

            // Older clients may omit Program, so retain the account value as
            // a compatibility fallback. Known abbreviations are normalized.
            var requestedProgram = NullIfEmpty(answers.Program) ?? NullIfEmpty(student.Program);
            if (requestedProgram == null)
                return (false, "Step 1: program graduated is required.");
            var canonicalProgram = ProgramCatalog.Canonicalize(requestedProgram);

            // Full questionnaire validation — the first failure names the
            // step and the field so the mobile UI can jump straight to it.
            var target = row ?? new TracerResponse { StudentId = studentId };
            ApplyAnswers(target, answers);

            var error = Validate(target);
            if (error != null)
                return (false, error);

            target.Status = "Submitted";
            target.SubmittedAt = DateTime.UtcNow;
            target.UpdatedAt = DateTime.UtcNow;

            if (row == null)
                await _tracerRepository.CreateAsync(target);
            else
                await _tracerRepository.UpdateAsync(target);

            if (!string.Equals(student.Program, canonicalProgram, StringComparison.Ordinal))
            {
                student.Program = canonicalProgram;
                await _studentRepository.UpdateAsync(student);
            }

            await _activityLogRepository.LogStudentAsync(
                studentId, "TRACER_SUBMIT",
                isUpdate ? "Graduate Tracer Study updated" : "Graduate Tracer Study submitted",
                ipAddress);

            return (true, isUpdate
                ? "Your answers have been updated."
                : "Thank you! Your answers have been submitted.");
        }

        public async Task<TracerAnswersDto?> GetMyAnswersAsync(int studentId)
        {
            var row = await _tracerRepository.GetByStudentAsync(studentId);
            return row == null ? null : Map(row);
        }

        // ------------------------------------------------------------------
        // Admin reporting (P3) — SuperAdmin + Staff read-only
        // ------------------------------------------------------------------

        // Page size for the admin responses table (ActivityLog convention).
        private const int AdminPageSize = 10;

        public async Task<(List<TracerResponseRowDto> Items, int Total)> GetAdminResponsesAsync(
            int page, string? search, string? status, string? employment,
            string? relatedness, string? program)
        {
            if (page < 1) page = 1;

            var (rows, total) = await _tracerRepository.GetAdminResponsesAsync(
                page, AdminPageSize, search, status, employment, relatedness, program);

            var items = rows.Select(r => new TracerResponseRowDto
            {
                Id = r.Id,
                StudentId = r.StudentId,
                FullName = r.Student.FullName,
                StudentNumber = r.Student.StudentNumber,
                Program = r.Student.Program,
                Email = r.Student.Email,
                Status = r.Status,
                CurrentStep = r.CurrentStep,
                EmploymentStatus = r.EmploymentStatus,
                CourseRelatedness = r.CourseRelatedness,
                CompanyName = r.CompanyName,
                Position = r.Position,
                SalaryBand = r.SalaryBand,
                Satisfied = r.Satisfied,
                SubmittedAt = r.SubmittedAt,
                UpdatedAt = r.UpdatedAt
            }).ToList();

            return (items, total);
        }

        public async Task<TracerAdminStatsDto> GetAdminStatsAsync()
        {
            var all = await _tracerRepository.GetAllWithStudentsAsync();
            var graduates = await _tracerRepository.GetGraduateCountAsync();

            // Distributions cover SUBMITTED rows only — drafts are partial
            // and would distort every chart. Drafts feed the funnel instead.
            var submitted = all.Where(r => r.Status == "Submitted").ToList();
            var drafts = all.Where(r => r.Status == "Draft").ToList();

            var stats = new TracerAdminStatsDto
            {
                TotalGraduates = graduates,
                Submitted = submitted.Count,
                Drafts = drafts.Count,
                ResponseRate = graduates > 0
                    ? Math.Round(100.0 * submitted.Count / graduates, 1)
                    : 0
            };

            // Drop-off funnel: drafts parked at each resume step.
            for (var step = 1; step <= 5; step++)
                stats.DraftsByStep.Add(new TracerCountItemDto
                {
                    Label = $"Step {step}",
                    Count = drafts.Count(r => r.CurrentStep == step)
                });

            stats.EmployedCount = submitted.Count(
                r => EmployedStatuses.Contains(r.EmploymentStatus ?? ""));

            var answeredRelatedness = submitted.Where(r => r.CourseRelatedness != null).ToList();
            stats.RelatednessAnswers = answeredRelatedness.Count;
            stats.CourseRelatedCount = answeredRelatedness.Count(
                r => r.CourseRelatedness == "Highly Related" || r.CourseRelatedness == "Related");

            stats.SatisfiedYes = submitted.Count(r => r.Satisfied == "Yes");
            stats.RecommendYes = submitted.Count(r => r.WouldRecommend == "Yes");

            // Distributions in questionnaire order (paper-form order, not
            // alphabetical) with zero-count options omitted. Ordered lists —
            // dictionaries would get their keys camelCased by JSON defaults.
            foreach (var option in EmploymentStatuses)
            {
                var count = submitted.Count(r => r.EmploymentStatus == option);
                if (count > 0)
                    stats.Employment.Add(new TracerCountItemDto { Label = option, Count = count });
            }
            foreach (var option in RelatednessOptions)
            {
                var count = submitted.Count(r => r.CourseRelatedness == option);
                if (count > 0)
                    stats.Relatedness.Add(new TracerCountItemDto { Label = option, Count = count });
            }
            foreach (var band in SalaryBands)
            {
                var count = submitted.Count(r => r.SalaryBand == band);
                if (count > 0)
                    stats.Salary.Add(new TracerCountItemDto { Label = band, Count = count });
            }

            // Skills frequency, highest first — "skills the school should
            // teach more of". Ties break on questionnaire order for stable
            // rendering.
            var skillCounts = new Dictionary<string, int>();
            foreach (var row in submitted)
            {
                foreach (var skill in ParseSkills(row.SkillsUsed))
                    skillCounts[skill] = skillCounts.TryGetValue(skill, out var n) ? n + 1 : 1;
            }
            foreach (var pair in skillCounts
                .OrderByDescending(p => p.Value)
                .ThenBy(p => SkillOptions.IndexOf(p.Key)))
            {
                stats.TopSkills.Add(new TracerCountItemDto { Label = pair.Key, Count = pair.Value });
            }

            stats.Programs = await _tracerRepository.GetGraduateProgramsAsync();
            return stats;
        }

        public async Task<(string Csv, int RowCount)> BuildExportCsvAsync(int adminId)
        {
            var rows = await _tracerRepository.GetAllWithStudentsAsync();

            // Submitted first (newest first), then drafts — the school reads
            // completed responses top-down.
            rows = rows
                .OrderByDescending(r => r.SubmittedAt != null)
                .ThenByDescending(r => r.SubmittedAt ?? DateTime.MinValue)
                .ThenByDescending(r => r.UpdatedAt)
                .ToList();

            // UTF-8 BOM so Excel opens Filipino names correctly; every field
            // quoted so free-text answers with commas/newlines stay intact.
            var sb = new StringBuilder();
            sb.Append('\uFEFF');
            sb.AppendLine(string.Join(",", CsvHeaders));

            foreach (var r in rows)
            {
                var cells = new[]
                {
                    r.Student.StudentNumber,
                    r.Student.FullName,
                    r.Student.Program,
                    r.YearGraduated?.ToString(),
                    r.Student.Email,
                    r.Status,
                    r.Sex,
                    r.ContactNo,
                    r.EmailOrFb,
                    r.PermanentAddress,
                    r.PresentAddress,
                    r.EmploymentStatus,
                    r.CompanyName,
                    r.Position,
                    r.CompanyType,
                    r.CompanyTypeOther,
                    r.SalaryBand,
                    r.MonthsToJob,
                    r.JobSource,
                    r.CourseRelatedness,
                    r.CourseRelatednessComment,
                    r.SkillsUsed,
                    r.SkillsUsedOther,
                    r.SkillsWanted,
                    r.Satisfied,
                    r.SatisfiedReason,
                    r.WouldRecommend,
                    r.CurrentStep.ToString(),
                    r.SubmittedAt?.ToString("yyyy-MM-dd HH:mm:ss"),
                    r.UpdatedAt.ToString("yyyy-MM-dd HH:mm:ss")
                };
                sb.AppendLine(string.Join(",", cells.Select(Q)));
            }

            await _activityLogRepository.LogAdminAsync(
                adminId, "EXPORT_TRACER",
                $"Exported {rows.Count} tracer responses", "system");

            return (sb.ToString(), rows.Count);
        }

        // Admin cleanup — removes a response row outright. Used by the
        // smoke/seed scripts to reset test accounts and by SuperAdmin to
        // purge wrong submissions before the school export. Deleting the
        // row re-locks the student's gate (tracerCompleted is derived from
        // the row's existence, not a stored flag).
        public async Task<(bool Success, string Message)> DeleteResponseAsync(
            int id, int adminId, string ipAddress)
        {
            var row = await _tracerRepository.GetByIdAsync(id);
            if (row == null)
                return (false, "Response not found.");

            var studentNo = row.Student?.StudentNumber ?? $"#{id}";
            await _tracerRepository.DeleteAsync(row);

            await _activityLogRepository.LogAdminAsync(
                adminId, "DELETE_TRACER",
                $"Deleted tracer response for {studentNo}", ipAddress);

            return (true, $"Deleted tracer response for {studentNo}.");
        }

        // Quote-all CSV cell (doubles embedded quotes).
        private static string Q(string? value) =>
            "\"" + (value ?? "").Replace("\"", "\"\"") + "\"";

        // 30 columns — every questionnaire field plus the student join.
        private static readonly string[] CsvHeaders =
        {
            "StudentNumber", "FullName", "Program", "YearGraduated", "Email", "Status",
            "Sex", "ContactNo", "EmailOrFb", "PermanentAddress", "PresentAddress",
            "EmploymentStatus", "CompanyName", "Position", "CompanyType",
            "CompanyTypeOther", "SalaryBand", "MonthsToJob", "JobSource",
            "CourseRelatedness", "CourseRelatednessComment", "SkillsUsed",
            "SkillsUsedOther", "SkillsWanted", "Satisfied", "SatisfiedReason",
            "WouldRecommend", "CurrentStep", "SubmittedAt", "UpdatedAt"
        };

        // ------------------------------------------------------------------
        // Validation (Section A–E rules from the paper questionnaire)
        // ------------------------------------------------------------------

        private static string? Validate(TracerResponse r)
        {
            // A. Profile — name and program come from the account. The
            // graduate supplies the actual year because SchoolYear is only
            // the account classification "Graduate".
            if (!Sexes.Contains(r.Sex ?? ""))
                return "Step 1: please choose your sex.";
            if (!r.YearGraduated.HasValue ||
                r.YearGraduated.Value < 1900 ||
                r.YearGraduated.Value > DateTime.UtcNow.Year)
                return $"Step 1: enter a valid graduation year from 1900 to {DateTime.UtcNow.Year}.";
            if (string.IsNullOrWhiteSpace(r.ContactNo))
                return "Step 1: contact number is required.";

            // B. Employment status — the branch point.
            if (!EmploymentStatuses.Contains(r.EmploymentStatus ?? ""))
                return "Step 2: please choose your employment status.";

            bool employed = EmployedStatuses.Contains(r.EmploymentStatus ?? "");

            // C. Employment details — required only for employed respondents;
            // the branch skips it for unemployed / studying.
            if (employed)
            {
                if (string.IsNullOrWhiteSpace(r.CompanyName))
                    return "Step 3: company name is required.";
                if (string.IsNullOrWhiteSpace(r.Position))
                    return "Step 3: position / job title is required.";
                if (!CompanyTypes.Contains(r.CompanyType ?? ""))
                    return "Step 3: please choose the type of company.";
                if (r.CompanyType == "Others" && string.IsNullOrWhiteSpace(r.CompanyTypeOther))
                    return "Step 3: please specify the type of company.";
                if (!SalaryBands.Contains(r.SalaryBand ?? ""))
                    return "Step 3: please choose your monthly salary range.";
                if (!MonthsToJobOptions.Contains(r.MonthsToJob ?? ""))
                    return "Step 3: please choose how many months after graduation you got this job.";
                if (!JobSources.Contains(r.JobSource ?? ""))
                    return "Step 3: please choose how you got the job.";
            }

            // D. Alignment to course — the school's most important section.
            // Unemployed respondents have no current job, so relatedness and
            // the explanation are optional for them (the paper form still
            // shows Section D, so any answer they do give must be valid).
            if (employed)
            {
                if (!RelatednessOptions.Contains(r.CourseRelatedness ?? ""))
                    return "Step 4: please rate how related your job is to your program.";
                if (string.IsNullOrWhiteSpace(r.CourseRelatednessComment))
                    return "Step 4: please explain how your job uses what you learned in your program.";
                var skills = ParseSkills(r.SkillsUsed);
                if (skills.Count == 0)
                    return "Step 4: please pick the skills you use most at work.";
                if (skills.Any(s => !SkillOptions.Contains(s)))
                    return "Step 4: please pick valid skills from the list.";
                if (skills.Contains("Others") && string.IsNullOrWhiteSpace(r.SkillsUsedOther))
                    return "Step 4: please specify which other skills you use.";
            }
            else if (r.CourseRelatedness != null && !RelatednessOptions.Contains(r.CourseRelatedness))
            {
                return "Step 4: please choose a valid program-relatedness answer.";
            }

            // E. Feedback.
            if (!YesNo.Contains(r.Satisfied ?? ""))
                return "Step 5: please say whether you are satisfied with your training.";
            if (r.Satisfied == "No" && string.IsNullOrWhiteSpace(r.SatisfiedReason))
                return "Step 5: please tell us why you are not satisfied.";
            if (!YesNo.Contains(r.WouldRecommend ?? ""))
                return "Step 5: please say whether you would recommend your program.";

            return null;
        }

        // ------------------------------------------------------------------
        // Mapping
        // ------------------------------------------------------------------

        // The client always sends the full answer set, so the draft write is
        // a plain overwrite — no merge, no stale values.
        private static void ApplyAnswers(TracerResponse row, TracerAnswersDto a)
        {
            row.CurrentStep = Math.Clamp(a.CurrentStep, 1, 5);
            row.Sex = NullIfEmpty(a.Sex);
            row.YearGraduated = a.YearGraduated;
            row.ContactNo = NullIfEmpty(a.ContactNo);
            row.EmailOrFb = NullIfEmpty(a.EmailOrFb);
            row.PermanentAddress = NullIfEmpty(a.PermanentAddress);
            row.PresentAddress = NullIfEmpty(a.PresentAddress);
            row.EmploymentStatus = NullIfEmpty(a.EmploymentStatus);
            row.CompanyName = NullIfEmpty(a.CompanyName);
            row.Position = NullIfEmpty(a.Position);
            row.CompanyType = NullIfEmpty(a.CompanyType);
            row.CompanyTypeOther = NullIfEmpty(a.CompanyTypeOther);
            row.SalaryBand = NullIfEmpty(a.SalaryBand);
            row.MonthsToJob = NullIfEmpty(a.MonthsToJob);
            row.JobSource = NullIfEmpty(a.JobSource);
            row.CourseRelatedness = NullIfEmpty(a.CourseRelatedness);
            row.CourseRelatednessComment = NullIfEmpty(a.CourseRelatednessComment);
            row.SkillsUsed = NullIfEmpty(a.SkillsUsed);
            row.SkillsUsedOther = NullIfEmpty(a.SkillsUsedOther);
            row.SkillsWanted = NullIfEmpty(a.SkillsWanted);
            row.Satisfied = NullIfEmpty(a.Satisfied);
            row.SatisfiedReason = NullIfEmpty(a.SatisfiedReason);
            row.WouldRecommend = NullIfEmpty(a.WouldRecommend);
        }

        private static TracerAnswersDto Map(TracerResponse r) => new()
        {
            CurrentStep = r.CurrentStep,
            Program = r.Student.Program,
            YearGraduated = r.YearGraduated,
            Sex = r.Sex,
            ContactNo = r.ContactNo,
            EmailOrFb = r.EmailOrFb,
            PermanentAddress = r.PermanentAddress,
            PresentAddress = r.PresentAddress,
            EmploymentStatus = r.EmploymentStatus,
            CompanyName = r.CompanyName,
            Position = r.Position,
            CompanyType = r.CompanyType,
            CompanyTypeOther = r.CompanyTypeOther,
            SalaryBand = r.SalaryBand,
            MonthsToJob = r.MonthsToJob,
            JobSource = r.JobSource,
            CourseRelatedness = r.CourseRelatedness,
            CourseRelatednessComment = r.CourseRelatednessComment,
            SkillsUsed = r.SkillsUsed,
            SkillsUsedOther = r.SkillsUsedOther,
            SkillsWanted = r.SkillsWanted,
            Satisfied = r.Satisfied,
            SatisfiedReason = r.SatisfiedReason,
            WouldRecommend = r.WouldRecommend,
            Completed = r.Status == "Submitted",
            SubmittedAt = r.SubmittedAt
        };

        private static List<string> ParseSkills(string? value) =>
            string.IsNullOrWhiteSpace(value)
                ? new List<string>()
                : value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .ToList();

        private static string? NullIfEmpty(string? value) =>
            string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}

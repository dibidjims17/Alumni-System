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

        public TracerService(
            ITracerRepository tracerRepository,
            IActivityLogRepository activityLogRepository)
        {
            _tracerRepository = tracerRepository;
            _activityLogRepository = activityLogRepository;
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

            if (row != null && row.Status == "Submitted")
                return (false, "Your Tracer Study has already been submitted.");

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
            if (row != null && row.Status == "Submitted")
                return (false, "Your Tracer Study has already been submitted.");

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

            await _activityLogRepository.LogStudentAsync(
                studentId, "TRACER_SUBMIT", "Graduate Tracer Study submitted", ipAddress);

            return (true, "Thank you! Your answers have been submitted.");
        }

        public async Task<TracerAnswersDto?> GetMyAnswersAsync(int studentId)
        {
            var row = await _tracerRepository.GetByStudentAsync(studentId);
            return row == null ? null : Map(row);
        }

        // ------------------------------------------------------------------
        // Validation (Section A–E rules from the paper questionnaire)
        // ------------------------------------------------------------------

        private static string? Validate(TracerResponse r)
        {
            // A. Profile — name / course / year come from the account.
            if (!Sexes.Contains(r.Sex ?? ""))
                return "Step 1: please choose your sex.";
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
                    return "Step 4: please rate how related your job is to your course.";
                if (string.IsNullOrWhiteSpace(r.CourseRelatednessComment))
                    return "Step 4: please explain how your job uses what you learned in your course.";
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
                return "Step 4: please choose a valid course-relatedness answer.";
            }

            // E. Feedback.
            if (!YesNo.Contains(r.Satisfied ?? ""))
                return "Step 5: please say whether you are satisfied with your training.";
            if (r.Satisfied == "No" && string.IsNullOrWhiteSpace(r.SatisfiedReason))
                return "Step 5: please tell us why you are not satisfied.";
            if (!YesNo.Contains(r.WouldRecommend ?? ""))
                return "Step 5: please say whether you would recommend your course.";

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
            row.ContactNo = NullIfEmpty(a.ContactNo);
            row.EmailOrFb = NullIfEmpty(a.EmailOrFb);
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
            Sex = r.Sex,
            ContactNo = r.ContactNo,
            EmailOrFb = r.EmailOrFb,
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

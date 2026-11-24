using System.Globalization;
using System.Text;
using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Shared.DTOs;

namespace MyApp.Application.Services
{
    public class CareerService : ICareerService
    {
        public static readonly List<string> EmploymentStatuses = new()
        {
            "Employed",
            "Self-Employed",
            "Unemployed",
            "Further Studies"
        };

        // Statuses that imply the alumnus holds a job, so job details are
        // required for them and meaningless otherwise.
        private static readonly List<string> OccupiedStatuses = new() { "Employed", "Self-Employed" };

        private readonly ICareerRepository _careerRepository;
        private readonly IStudentRepository _studentRepository;
        private readonly IActivityLogRepository _activityLogRepository;
        private readonly INotificationService _notificationService;

        public CareerService(
            ICareerRepository careerRepository,
            IStudentRepository studentRepository,
            IActivityLogRepository activityLogRepository,
            INotificationService notificationService)
        {
            _careerRepository = careerRepository;
            _studentRepository = studentRepository;
            _activityLogRepository = activityLogRepository;
            _notificationService = notificationService;
        }

        public async Task<CareerRecordDto?> GetMyRecordAsync(int studentId)
        {
            var record = await _careerRepository.GetLatestByStudentAsync(studentId);
            return record == null ? null : Map(record);
        }

        public async Task<(bool Success, string Message, CareerRecordDto? Record)> SubmitProofAsync(
            int studentId, CareerSubmitRequest request, string ipAddress)
        {
            var status = (request.EmploymentStatus ?? string.Empty).Trim();
            if (!EmploymentStatuses.Contains(status))
                return (false, "Please choose a valid employment status.", null);

            var jobTitle = NullIfEmpty(request.JobTitle);
            var company = NullIfEmpty(request.Company);
            var industry = NullIfEmpty(request.Industry);

            if (OccupiedStatuses.Contains(status))
            {
                if (jobTitle == null)
                    return (false, "Job title is required for this employment status.", null);
                if (company == null)
                    return (false, "Company is required for this employment status.", null);
            }

            if (string.IsNullOrWhiteSpace(request.CertificatePath) ||
                string.IsNullOrWhiteSpace(request.WorkIdPath))
                return (false, "Both a certificate of employment and a work ID are required.", null);

            var existing = await _careerRepository.GetLatestByStudentAsync(studentId);

            if (existing != null && existing.Status == "Pending")
            {
                // Replace the outstanding request in place: keeps exactly one
                // row awaiting review per student while the reviewed history
                // rows stay untouched.
                var previousCertificate = existing.CertificatePath;
                var previousWorkId = existing.WorkIdPath;

                existing.EmploymentStatus = status;
                existing.JobTitle = jobTitle;
                existing.Company = company;
                existing.Industry = industry;
                existing.DateStarted = request.DateStarted;
                existing.CourseAlignment = null;
                existing.CertificatePath = request.CertificatePath;
                existing.CertificateFileName = request.CertificateFileName;
                existing.WorkIdPath = request.WorkIdPath;
                existing.WorkIdFileName = request.WorkIdFileName;
                existing.UpdatedAt = DateTime.UtcNow;

                await _careerRepository.UpdateAsync(existing);
                DeleteQuietly(previousCertificate, request.CertificatePath);
                DeleteQuietly(previousWorkId, request.WorkIdPath);

                await _activityLogRepository.LogStudentAsync(studentId, "UPDATE_CAREER_PROOF",
                    $"Updated pending career proof ({status})", ipAddress);

                return (true, "Your proof of occupation has been updated.", Map(existing));
            }

            var record = new CareerRecord
            {
                StudentId = studentId,
                EmploymentStatus = status,
                JobTitle = jobTitle,
                Company = company,
                Industry = industry,
                DateStarted = request.DateStarted,
                CertificatePath = request.CertificatePath,
                CertificateFileName = request.CertificateFileName,
                WorkIdPath = request.WorkIdPath,
                WorkIdFileName = request.WorkIdFileName,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _careerRepository.CreateAsync(record);
            await _activityLogRepository.LogStudentAsync(studentId, "SUBMIT_CAREER_PROOF",
                $"Submitted career proof ({status})", ipAddress);

            return (true, "Your proof of occupation has been submitted for review.", Map(record));
        }

        public async Task<List<CareerRecordDto>> GetQueueAsync(string? status, string? search)
        {
            var records = await _careerRepository.GetAllAsync(status);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                records = records.Where(r =>
                    (r.Student?.FullName?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false) ||
                    (r.Student?.StudentNumber?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false) ||
                    (r.Company?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false) ||
                    (r.JobTitle?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false)
                ).ToList();
            }

            var dtos = records.Select(Map).ToList();

            // Rejected rows can be reminded to resubmit — surface cooldown
            // state so the UI disables the button instead of erroring.
            var rejectedIds = records
                .Where(r => r.Status == "Rejected")
                .Select(r => r.StudentId)
                .ToList();
            if (rejectedIds.Count > 0)
            {
                var reminders = await _notificationService.GetActiveCareerRemindersAsync(
                    rejectedIds, "CAREER_RESUBMIT_REMINDER");
                foreach (var dto in dtos.Where(d => d.Status == "Rejected"))
                {
                    if (reminders.TryGetValue(dto.StudentId, out var sentAt))
                    {
                        dto.ReminderActive = true;
                        dto.ReminderSentAt = sentAt;
                    }
                }
            }

            return dtos;
        }

        public async Task<CareerRecordDto?> GetByIdAsync(int id)
        {
            var record = await _careerRepository.GetByIdAsync(id);
            return record == null ? null : Map(record);
        }

        public async Task<(bool Success, string Message)> ReviewAsync(
            int recordId, CareerReviewRequest request, int adminId, string ipAddress)
        {
            var status = (request.Status ?? string.Empty).Trim();
            if (status != "Approved" && status != "Rejected")
                return (false, "Status must be Approved or Rejected.");

            var note = NullIfEmpty(request.Note);
            if (status == "Rejected" && note == null)
                return (false, "A reason is required when rejecting a submission.");

            string? courseAlignment = null;
            if (status == "Approved")
            {
                var requestedAlignment = NullIfEmpty(request.CourseAlignment);
                courseAlignment = CareerAlignmentSuggester.ConfirmedValues.FirstOrDefault(value =>
                    value.Equals(requestedAlignment, StringComparison.OrdinalIgnoreCase));

                if (courseAlignment == null)
                    return (false, "Confirm how this career path aligns with the graduate program.");
            }

            var record = await _careerRepository.GetByIdAsync(recordId);
            if (record == null)
                return (false, "Career record not found.");

            if (record.Status != "Pending")
                return (false, "This submission has already been reviewed.");

            if (status == "Approved" &&
                OccupiedStatuses.Contains(record.EmploymentStatus) &&
                courseAlignment == CareerAlignmentSuggester.NotApplicable)
            {
                return (false, "An employed career path cannot be marked Not Applicable.");
            }

            if (status == "Approved" &&
                record.EmploymentStatus == "Unemployed" &&
                courseAlignment != CareerAlignmentSuggester.NotApplicable)
            {
                return (false, "Unemployed records must use Not Applicable for course alignment.");
            }

            record.Status = status;
            record.ReviewNote = note;
            record.CourseAlignment = status == "Approved" ? courseAlignment : null;
            record.ReviewedByAdminId = adminId;
            record.ReviewedAt = DateTime.UtcNow;
            record.UpdatedAt = DateTime.UtcNow;

            await _careerRepository.UpdateAsync(record);
            await _activityLogRepository.LogAdminAsync(adminId, "REVIEW_CAREER_PROOF",
                status == "Approved"
                    ? $"Approved career proof for alumni record {record.StudentId} ({courseAlignment})"
                    : $"Rejected career proof for alumni record {record.StudentId}",
                ipAddress);

            return (true, status == "Approved"
                ? "Submission approved."
                : "Submission rejected.");
        }

        public async Task<CareerStatsDto> GetStatsAsync()
        {
            var history = await _careerRepository.GetHistoryAsync();

            // A student may have submitted several times — only their newest
            // record counts, otherwise re-submissions would inflate the totals.
            var latest = history
                .GroupBy(r => r.StudentId)
                .Select(g => g.OrderByDescending(r => r.Id).First())
                .ToList();

            var approved = latest.Where(r => r.Status == "Approved").ToList();
            var aligned = approved.Count(r => r.CourseAlignment == CareerAlignmentSuggester.Aligned);
            var related = approved.Count(r => r.CourseAlignment == CareerAlignmentSuggester.Related);
            var notAligned = approved.Count(r => r.CourseAlignment == CareerAlignmentSuggester.NotAligned);
            var notApplicable = approved.Count(r => r.CourseAlignment == CareerAlignmentSuggester.NotApplicable);
            var assessed = aligned + related + notAligned;

            return new CareerStatsDto
            {
                TotalGraduates = await _studentRepository.CountGraduateAsync(),
                Submitted = latest.Count,
                Pending = latest.Count(r => r.Status == "Pending"),
                Approved = approved.Count,
                Rejected = latest.Count(r => r.Status == "Rejected"),
                Employed = approved.Count(r => r.EmploymentStatus == "Employed"),
                SelfEmployed = approved.Count(r => r.EmploymentStatus == "Self-Employed"),
                Unemployed = approved.Count(r => r.EmploymentStatus == "Unemployed"),
                FurtherStudies = approved.Count(r => r.EmploymentStatus == "Further Studies"),
                Aligned = aligned,
                Related = related,
                NotAligned = notAligned,
                NotApplicable = notApplicable,
                Unassessed = approved.Count(r => string.IsNullOrWhiteSpace(r.CourseAlignment)),
                AlignmentRate = assessed == 0
                    ? 0
                    : (int)Math.Round((aligned + related) * 100.0 / assessed)
            };
        }

        // ------------------------------------------------------------------
        // Month-scoped report (registrar deliverable) — submissions received
        // in the month, review workload for the month, distributions over
        // those submissions, and the rows behind the numbers.
        // ------------------------------------------------------------------

        public async Task<CareerReportDto?> GetReportAsync(int year, int month)
        {
            if (!TryGetMonthRange(year, month, out var from, out var to))
                return null;

            var rows = await _careerRepository.GetSubmittedBetweenAsync(from, to);
            var reviewedThisMonth = await _careerRepository.CountReviewedBetweenAsync(from, to);

            var approved = rows.Where(r => r.Status == "Approved").ToList();

            return new CareerReportDto
            {
                Month = $"{year}-{month:00}",
                MonthLabel = new DateTime(year, month, 1)
                    .ToString("MMMM yyyy", CultureInfo.InvariantCulture),
                Submitted = rows.Count,
                Approved = approved.Count,
                Pending = rows.Count(r => r.Status == "Pending"),
                Rejected = rows.Count(r => r.Status == "Rejected"),
                ReviewedThisMonth = reviewedThisMonth,
                ByEmployment = CountBy(rows, r => r.EmploymentStatus),
                ByAlignment = CountBy(
                    rows,
                    r => string.IsNullOrWhiteSpace(r.CourseAlignment)
                        ? "Unassessed"
                        : r.CourseAlignment!),
                ByProgram = CountBy(rows, r => r.Student?.Program ?? "—"),
                Rows = rows.Select(Map).ToList()
            };
        }

        // UTF-8 BOM so Excel opens Filipino names correctly; every field
        // quoted so free-text notes with commas/newlines stay intact —
        // identical conventions to the tracer export.
        public async Task<(string Csv, int RowCount)> BuildExportCsvAsync(
            int year, int month, int adminId)
        {
            if (!TryGetMonthRange(year, month, out var from, out var to))
                return (string.Empty, 0);

            var rows = await _careerRepository.GetSubmittedBetweenAsync(from, to);
            var monthLabel = new DateTime(year, month, 1)
                .ToString("MMMM yyyy", CultureInfo.InvariantCulture);

            var sb = new StringBuilder();
            sb.Append('\uFEFF');
            sb.AppendLine(string.Join(",", CsvHeaders));

            foreach (var r in rows)
            {
                var cells = new[]
                {
                    r.Student?.StudentNumber,
                    r.Student?.FullName,
                    r.Student?.Program,
                    r.Student?.Email,
                    r.EmploymentStatus,
                    r.JobTitle,
                    r.Company,
                    r.Industry,
                    r.DateStarted?.ToString("yyyy-MM-dd"),
                    r.CourseAlignment,
                    r.Status,
                    r.ReviewNote,
                    r.ReviewedByAdmin?.Username,
                    r.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                    r.ReviewedAt?.ToString("yyyy-MM-dd HH:mm:ss")
                };
                sb.AppendLine(string.Join(",", cells.Select(Q)));
            }

            await _activityLogRepository.LogAdminAsync(
                adminId, "EXPORT_CAREER",
                $"Exported {rows.Count} career records for {monthLabel}", "system");

            return (sb.ToString(), rows.Count);
        }

        // Month window in UTC (CreatedAt/ReviewedAt are stored as UTC).
        // Anything outside a sane range is rejected so a bad query string
        // can never produce an unbounded scan.
        private static bool TryGetMonthRange(
            int year, int month, out DateTime from, out DateTime to)
        {
            from = default;
            to = default;

            if (month < 1 || month > 12) return false;
            if (year < 2000 || year > 2100) return false;

            from = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
            to = from.AddMonths(1);
            return true;
        }

        // Ordered {label,count} rows — fixed option sets keep their order,
        // zero-count options omitted; unknown values sort after, by count.
        private static List<TracerCountItemDto> CountBy(
            List<CareerRecord> rows, Func<CareerRecord, string> keySelector)
        {
            return rows
                .GroupBy(keySelector)
                .Select(g => new TracerCountItemDto { Label = g.Key, Count = g.Count() })
                .OrderByDescending(i => i.Count)
                .ThenBy(i => i.Label, StringComparer.Ordinal)
                .ToList();
        }

        // Quote-all CSV cell (doubles embedded quotes).
        private static string Q(string? value) =>
            "\"" + (value ?? "").Replace("\"", "\"\"") + "\"";

        // 15 columns — student join, occupation, alignment and review trail.
        private static readonly string[] CsvHeaders =
        {
            "StudentNumber", "FullName", "Program", "Email",
            "EmploymentStatus", "JobTitle", "Company", "Industry",
            "DateStarted", "ProgramAlignment", "Status", "ReviewNote",
            "ReviewedBy", "SubmittedAt", "ReviewedAt"
        };

        public async Task<(bool Success, string Message)> SendReminderAsync(
            int studentId,
            int adminId,
            string ipAddress)
        {
            var student = await _studentRepository.GetByIdAsync(studentId);
            if (student == null)
                return (false, "Alumni record not found.");

            if (!student.IsActive)
                return (false, "Career reminders can only be sent to active alumni accounts.");

            if (!student.SchoolYear.Trim().Equals("Graduate", StringComparison.OrdinalIgnoreCase))
                return (false, "Career reminders are available to graduates only.");

            var record = await _careerRepository.GetLatestByStudentAsync(studentId);
            if (record?.Status == "Approved")
                return (false, "This alumnus already has a verified career record.");

            if (record?.Status == "Pending")
                return (false, "This alumnus already has a career submission awaiting review.");

            var needsResubmission = record?.Status == "Rejected";
            var (sent, message) = await _notificationService.NotifyCareerReminderAsync(
                studentId,
                needsResubmission);

            if (!sent) return (false, message);

            await _activityLogRepository.LogAdminAsync(
                adminId,
                "SEND_CAREER_REMINDER",
                needsResubmission
                    ? $"Reminded alumni account {student.StudentNumber} to resubmit career proof"
                    : $"Reminded alumni account {student.StudentNumber} to report career status",
                ipAddress);

            return (true, message);
        }

        // Active graduates who never submitted — the not-reported chase list
        // on the admin Careers page. Cooldown state rides along so the UI can
        // disable remind buttons before the API would reject a repeat send.
        public async Task<List<CareerNotReportedDto>> GetNotReportedAsync()
        {
            var students = await _studentRepository.GetAllAsync();
            var graduates = students
                .Where(s => s.IsActive &&
                    s.SchoolYear.Trim().Equals("Graduate", StringComparison.OrdinalIgnoreCase))
                .ToList();

            var careers = await _careerRepository
                .GetLatestByStudentIdsAsync(graduates.Select(s => s.Id));
            var missing = graduates.Where(s => !careers.ContainsKey(s.Id)).ToList();

            var reminders = await _notificationService.GetActiveCareerRemindersAsync(
                missing.Select(s => s.Id), "CAREER_REMINDER");

            return missing
                .OrderBy(s => s.FullName)
                .Select(s =>
                {
                    reminders.TryGetValue(s.Id, out var sentAt);
                    return new CareerNotReportedDto
                    {
                        StudentId = s.Id,
                        StudentName = s.FullName,
                        StudentNumber = s.StudentNumber,
                        Program = s.Program,
                        SchoolYear = s.SchoolYear,
                        ReminderActive = sentAt != default,
                        ReminderSentAt = sentAt != default ? sentAt : null
                    };
                })
                .ToList();
        }

        // One bulk send to every graduate without a submission. Students
        // already in cooldown are skipped (not failed), so the whole send
        // completes and the admin sees exactly what went out.
        public async Task<(int Sent, int Skipped, int Failed, string Message)> RemindAllNotReportedAsync(
            int adminId,
            string ipAddress)
        {
            var missing = await GetNotReportedAsync();
            if (missing.Count == 0)
                return (0, 0, 0, "Every active graduate already has a career submission.");

            int sent = 0, skipped = 0, failed = 0;
            foreach (var row in missing)
            {
                if (row.ReminderActive)
                {
                    skipped++;
                    continue;
                }

                var (success, _) = await SendReminderAsync(row.StudentId, adminId, ipAddress);
                if (success) sent++;
                else failed++;
            }

            var parts = new List<string> { $"Sent {sent} reminder{(sent == 1 ? "" : "s")}" };
            if (skipped > 0)
                parts.Add($"{skipped} skipped (already reminded within the last 7 days)");
            if (failed > 0)
                parts.Add($"{failed} failed");

            return (sent, skipped, failed, string.Join("; ", parts) + ".");
        }

        private static CareerRecordDto Map(CareerRecord r)
        {
            var suggestion = CareerAlignmentSuggester.Suggest(
                r.Student?.Program,
                r.EmploymentStatus,
                r.JobTitle,
                r.Industry);

            return new CareerRecordDto
            {
                Id = r.Id,
                StudentId = r.StudentId,
                StudentName = r.Student?.FullName,
                StudentNumber = r.Student?.StudentNumber,
                Program = r.Student?.Program,
                SchoolYear = r.Student?.SchoolYear,
                EmploymentStatus = r.EmploymentStatus,
                JobTitle = r.JobTitle,
                Company = r.Company,
                Industry = r.Industry,
                DateStarted = r.DateStarted,
                CourseAlignment = r.CourseAlignment,
                SuggestedCourseAlignment = suggestion.Value,
                AlignmentSuggestionReason = suggestion.Reason,
                CertificatePath = r.CertificatePath,
                CertificateFileName = r.CertificateFileName,
                WorkIdPath = r.WorkIdPath,
                WorkIdFileName = r.WorkIdFileName,
                Status = r.Status,
                ReviewNote = r.ReviewNote,
                ReviewedByAdminName = r.ReviewedByAdmin?.Username,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt,
                ReviewedAt = r.ReviewedAt
            };
        }

        private static string? NullIfEmpty(string? value) =>
            string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        // Best-effort cleanup when a pending submission is replaced — a stale
        // file on disk is harmless, so failures are ignored.
        private static void DeleteQuietly(string? path, string? keepPath)
        {
            if (string.IsNullOrWhiteSpace(path) || path == keepPath) return;
            try
            {
                var fullPath = Path.Combine(Directory.GetCurrentDirectory(), path);
                if (File.Exists(fullPath)) File.Delete(fullPath);
            }
            catch { }
        }
    }
}

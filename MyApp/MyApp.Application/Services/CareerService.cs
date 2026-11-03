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

        public CareerService(
            ICareerRepository careerRepository,
            IStudentRepository studentRepository,
            IActivityLogRepository activityLogRepository)
        {
            _careerRepository = careerRepository;
            _studentRepository = studentRepository;
            _activityLogRepository = activityLogRepository;
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

            return records.Select(Map).ToList();
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

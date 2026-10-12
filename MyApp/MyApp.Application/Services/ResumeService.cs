using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Shared.DTOs;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace MyApp.Application.Services
{
    public class ResumeService : IResumeService
    {
        private readonly IResumeRepository _resumeRepository;
        private readonly IActivityLogRepository _activityLogRepository;
        private readonly IProfileService _profileService;
        private readonly IStudentRepository _studentRepository;

        // QuestPDF community license (required — throws without it).
        static ResumeService()
        {
            QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
        }

        public ResumeService(
            IResumeRepository resumeRepository,
            IActivityLogRepository activityLogRepository,
            IProfileService profileService,
            IStudentRepository studentRepository)
        {
            _resumeRepository = resumeRepository;
            _activityLogRepository = activityLogRepository;
            _profileService = profileService;
            _studentRepository = studentRepository;
        }

        public async Task<List<ResumeDto>> GetResumesAsync(int studentId)
        {
            var resumes = await _resumeRepository.GetByStudentIdAsync(studentId);
            return resumes.Select(r => new ResumeDto
            {
                Id = r.Id,
                FileName = r.FileName,
                UploadedAt = r.UploadedAt,
                IsActive = r.IsActive
            }).ToList();
        }

        public async Task<ResumeDto?> GetActiveResumeAsync(int studentId)
        {
            var resume = await _resumeRepository.GetActiveByStudentIdAsync(studentId);
            if (resume == null) return null;

            return new ResumeDto
            {
                Id = resume.Id,
                FileName = resume.FileName,
                UploadedAt = resume.UploadedAt,
                IsActive = resume.IsActive,
                Source = resume.Source
            };
        }

        public async Task<ResumeDto> UploadResumeAsync(int studentId, string fileName, string filePath, string ipAddress)
        {
            // Deactivate all previous resumes
            await _resumeRepository.DeactivateAllAsync(studentId);

            // Save new resume
            var resume = new Resume
            {
                StudentId = studentId,
                FileName = fileName,
                FilePath = filePath,
                UploadedAt = DateTime.UtcNow,
                IsActive = true
            };

            await _resumeRepository.CreateAsync(resume);
            await _activityLogRepository.LogStudentAsync(studentId, "UPLOAD_RESUME", $"Uploaded resume: {fileName}", ipAddress);

            return new ResumeDto
            {
                Id = resume.Id,
                FileName = resume.FileName,
                UploadedAt = resume.UploadedAt,
                IsActive = resume.IsActive,
                Source = resume.Source
            };
        }

        public async Task<ResumeDto?> GetResumeByIdAsync(int resumeId)
        {
            var resume = await _resumeRepository.GetByIdAsync(resumeId);
            if (resume == null) return null;

            return new ResumeDto
            {
                Id = resume.Id,
                StudentId = resume.StudentId,
                FileName = resume.FileName,
                FilePath = resume.FilePath,
                UploadedAt = resume.UploadedAt,
                IsActive = resume.IsActive,
                Source = resume.Source
            };
        }

        public async Task<(bool Success, string Message, ResumeDto? Resume)> GenerateResumeAsync(int studentId, string ipAddress)
        {
            var profile = await _profileService.GetProfileAsync(studentId);
            var student = await _studentRepository.GetByIdAsync(studentId);
            if (profile == null || student == null)
                return (false, "Complete your profile first.", null);

            // Completeness gate: a generated CV needs real substance.
            var missing = new List<string>();
            if (profile.Educations.Count == 0)
                missing.Add("education");
            if (profile.WorkExperiences.Count == 0 && profile.Skills.Count == 0)
                missing.Add("work experience or skills");
            if (string.IsNullOrWhiteSpace(profile.Phone) && string.IsNullOrWhiteSpace(student.Email))
                missing.Add("phone number or email");
            if (missing.Count > 0)
                return (false, $"Add {string.Join(", ", missing)} to your profile first.", null);

            var pdfBytes = BuildAtsResume(profile, student.Email);

            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "Resumes");
            Directory.CreateDirectory(uploadsFolder);

            var safeName = string.Concat($"{profile.FullName}_CV".Split(Path.GetInvalidFileNameChars()));
            var storedFileName = $"{studentId}_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}_generated.pdf";
            var filePath = Path.Combine(uploadsFolder, storedFileName);
            await File.WriteAllBytesAsync(filePath, pdfBytes);

            // Generated CV becomes active, same as an upload.
            await _resumeRepository.DeactivateAllAsync(studentId);

            var resume = new Resume
            {
                StudentId = studentId,
                FileName = $"{safeName}.pdf",
                FilePath = filePath,
                UploadedAt = DateTime.UtcNow,
                IsActive = true,
                Source = "Generated"
            };

            await _resumeRepository.CreateAsync(resume);
            await _activityLogRepository.LogStudentAsync(studentId, "GENERATE_RESUME", "Generated ATS CV from profile", ipAddress);

            return (true, "ATS CV generated.", new ResumeDto
            {
                Id = resume.Id,
                StudentId = resume.StudentId,
                FileName = resume.FileName,
                FilePath = resume.FilePath,
                UploadedAt = resume.UploadedAt,
                IsActive = resume.IsActive,
                Source = resume.Source
            });
        }

        // ATS-friendly layout: single column, standard headings, plain
        // selectable text. No tables, graphics, columns, or custom fonts —
        // anything parsers commonly choke on.
        private static byte[] BuildAtsResume(AlumniProfileDto profile, string email)
        {
            static string DateRange(DateTime start, DateTime? end, string presentLabel)
            {
                var range = $"{start:MMM yyyy} - ";
                return range + (end.HasValue ? end.Value.ToString("MMM yyyy") : presentLabel);
            }

            return Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(40);
                    page.DefaultTextStyle(x => x.FontSize(10).FontColor(Colors.Black));

                    page.Content().Column(col =>
                    {
                        col.Spacing(6);

                        // Contact header
                        col.Item().Text(profile.FullName).FontSize(17).Bold();
                        if (!string.IsNullOrWhiteSpace(profile.Headline))
                            col.Item().Text(profile.Headline).FontSize(11);
                        var contact = string.Join(" | ", new[]
                        {
                            email,
                            profile.Phone,
                            profile.Location,
                            profile.LinkedInUrl
                        }.Where(s => !string.IsNullOrWhiteSpace(s)));
                        if (!string.IsNullOrWhiteSpace(contact))
                            col.Item().Text(contact).FontSize(9);

                        // Summary
                        var summary = string.IsNullOrWhiteSpace(profile.Bio) ? profile.Headline : profile.Bio;
                        if (!string.IsNullOrWhiteSpace(summary))
                        {
                            col.Item().PaddingTop(6).Text("PROFESSIONAL SUMMARY").FontSize(11).Bold();
                            col.Item().Text(summary);
                        }

                        // Experience, newest first.
                        // Layout is parser-friendly on purpose: the date-range
                        // line comes FIRST, then title, then company — this
                        // matches ResumeParser's chunking (it splits entries
                        // on date lines and reads title/company after them),
                        // so Generate -> Upload & Auto-fill round-trips.
                        if (profile.WorkExperiences.Count > 0)
                        {
                            col.Item().PaddingTop(6).Text("WORK EXPERIENCE").FontSize(11).Bold();
                            foreach (var w in profile.WorkExperiences.OrderByDescending(w => w.StartDate))
                            {
                                col.Item().Column(item =>
                                {
                                    var dates = DateRange(w.StartDate, w.EndDate, "Present");
                                    item.Item().Text(dates).FontSize(9);
                                    item.Item().Text(w.JobTitle).Bold();
                                    var companyLine = string.IsNullOrWhiteSpace(w.Location)
                                        ? w.Company
                                        : $"{w.Company} | {w.Location}";
                                    item.Item().Text(companyLine);
                                    if (!string.IsNullOrWhiteSpace(w.Description))
                                        item.Item().Text(w.Description);
                                });
                            }
                        }

                        // Education, newest first. Same rule: the years line
                        // first, then degree, then school — one chunk per
                        // entry for the parser.
                        if (profile.Educations.Count > 0)
                        {
                            col.Item().PaddingTop(6).Text("EDUCATION").FontSize(11).Bold();
                            foreach (var e in profile.Educations.OrderByDescending(e => e.StartYear))
                            {
                                col.Item().Column(item =>
                                {
                                    var years = e.EndYear.HasValue ? $"{e.StartYear} - {e.EndYear}" : $"{e.StartYear} - Present";
                                    item.Item().Text(years).FontSize(9);
                                    var degree = string.IsNullOrWhiteSpace(e.FieldOfStudy)
                                        ? e.Degree
                                        : $"{e.Degree}, {e.FieldOfStudy}";
                                    item.Item().Text(degree).Bold();
                                    item.Item().Text(e.School);
                                });
                            }
                        }

                        // Skills as a plain comma list
                        if (profile.Skills.Count > 0)
                        {
                            col.Item().PaddingTop(6).Text("SKILLS").FontSize(11).Bold();
                            col.Item().Text(string.Join(", ", profile.Skills));
                        }
                    });
                });
            }).GeneratePdf();
        }
    }
}
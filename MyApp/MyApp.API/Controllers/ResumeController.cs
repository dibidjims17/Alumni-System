using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyApp.Application.Interfaces;
using MyApp.Application.Services;

namespace MyApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ResumeController : ControllerBase
    {
        private readonly IResumeService _resumeService;
        private readonly IProfileService _profileService;

        public ResumeController(IResumeService resumeService, IProfileService profileService)
        {
            _resumeService = resumeService;
            _profileService = profileService;
        }

        private int GetStudentId()
        {
            return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        }
        private bool IsGraduate() =>
        User.FindFirstValue("SchoolYear") == "Graduate";

        [HttpGet]
        public async Task<IActionResult> GetResumes()
        {
            var result = await _resumeService.GetResumesAsync(GetStudentId());
            return Ok(result);
        }

        [HttpGet("active")]
        public async Task<IActionResult> GetActiveResume()
        {
            var result = await _resumeService.GetActiveResumeAsync(GetStudentId());
            if (result == null) return NotFound(new { message = "No resume uploaded yet." });
            return Ok(result);
        }

        [HttpPost("generate")]
        public async Task<IActionResult> GenerateResume()
        {
            if (!IsGraduate()) return Forbid();
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var (success, message, resume) = await _resumeService.GenerateResumeAsync(GetStudentId(), ipAddress);
            if (!success) return BadRequest(new { message });
            return Ok(resume);
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadResume(IFormFile file)
        {
            if (!IsGraduate()) return Forbid();
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file provided." });

            // Only allow PDF
            if (!file.ContentType.Equals("application/pdf", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Only PDF files are allowed." });

            // Max 5MB
            if (file.Length > 5 * 1024 * 1024)
                return BadRequest(new { message = "File size must not exceed 5MB." });

            // Verify the content is a real PDF (magic bytes), not just named like one
            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            ms.Position = 0;

            var header = new byte[5];
            var bytesRead = await ms.ReadAsync(header, 0, header.Length);
            var isPdf = bytesRead == header.Length
                && header[0] == '%' && header[1] == 'P' && header[2] == 'D'
                && header[3] == 'F' && header[4] == '-';
            if (!isPdf)
                return BadRequest(new { message = "The uploaded file is not a valid PDF." });

            ms.Position = 0;

            var safeOriginalName = SanitizeFileName(file.FileName, "resume.pdf");
            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "Resumes");
            Directory.CreateDirectory(uploadsFolder);

            var storedFileName = $"{GetStudentId()}_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}.pdf";
            var filePath = Path.Combine(uploadsFolder, storedFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await ms.CopyToAsync(stream);
            }

            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var result = await _resumeService.UploadResumeAsync(GetStudentId(), safeOriginalName, filePath, ipAddress);

            return Ok(result);
        }

        // Upload + autofill: stores the PDF as the active resume, then
        // extracts high-confidence fields (phone, dated work/education,
        // dictionary skills) into the profile. Additive only — nothing
        // already on the profile is modified.
        [HttpPost("upload-fill")]
        public async Task<IActionResult> UploadAndFill(IFormFile file)
        {
            if (!IsGraduate()) return Forbid();
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file provided." });

            if (!file.ContentType.Equals("application/pdf", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Only PDF files are allowed." });

            if (file.Length > 5 * 1024 * 1024)
                return BadRequest(new { message = "File size must not exceed 5MB." });

            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            var pdfBytes = ms.ToArray();
            if (pdfBytes.Length < 5
                || pdfBytes[0] != '%' || pdfBytes[1] != 'P' || pdfBytes[2] != 'D'
                || pdfBytes[3] != 'F' || pdfBytes[4] != '-')
                return BadRequest(new { message = "The uploaded file is not a valid PDF." });

            var safeOriginalName = SanitizeFileName(file.FileName, "resume.pdf");
            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "Resumes");
            Directory.CreateDirectory(uploadsFolder);

            var storedFileName = $"{GetStudentId()}_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}.pdf";
            var filePath = Path.Combine(uploadsFolder, storedFileName);

            await System.IO.File.WriteAllBytesAsync(filePath, pdfBytes);

            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var resume = await _resumeService.UploadResumeAsync(GetStudentId(), safeOriginalName, filePath, ipAddress);

            ResumeParser.ParsedResume parsed;
            try
            {
                parsed = ResumeParser.Parse(pdfBytes);
            }
            catch
            {
                return Ok(new { resume, filled = new { workAdded = 0, educationAdded = 0, skillsAdded = 0, phoneSet = false }, warning = "Resume saved, but its text could not be read for autofill." });
            }

            var filled = await _profileService.FillFromResumeAsync(GetStudentId(), parsed, ipAddress);

            return Ok(new
            {
                resume,
                filled = new
                {
                    workAdded = filled.WorkAdded,
                    educationAdded = filled.EducationAdded,
                    skillsAdded = filled.SkillsAdded,
                    phoneSet = filled.PhoneSet
                }
            });
        }

        private static string SanitizeFileName(string fileName, string fallback)
        {
            if (string.IsNullOrWhiteSpace(fileName)) return fallback;

            var safe = Path.GetFileName(fileName); // strip any directory components
            safe = string.Concat(safe.Split(Path.GetInvalidFileNameChars())); // remove invalid chars
            safe = safe.Trim().TrimEnd('.');

            if (string.IsNullOrWhiteSpace(safe)) return fallback;
            if (safe.Length > 255) safe = safe[..255];

            return safe;
        }

        [HttpGet("{resumeId}/download")]
        public async Task<IActionResult> DownloadResume(int resumeId)
        {
            var role = User.FindFirstValue(ClaimTypes.Role);
            var isAdmin = role == "SuperAdmin" || role == "Staff";

            var resume = await _resumeService.GetResumeByIdAsync(resumeId);
            if (resume == null || !System.IO.File.Exists(resume.FilePath))
                return NotFound(new { message = "Resume file not found." });

            // Students can only download their own resume; admins can download any.
            if (!isAdmin && resume.StudentId != GetStudentId())
                return Forbid();

            var fileBytes = await System.IO.File.ReadAllBytesAsync(resume.FilePath);
            return File(fileBytes, "application/pdf", resume.FileName);
        }

        [HttpDelete("{resumeId}")]
        public async Task<IActionResult> DeleteResume(int resumeId)
        {
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var studentId = GetStudentId();
            var deleted = await _resumeService.DeleteResumeAsync(studentId, resumeId, ipAddress);
            if (!deleted) return NotFound(new { message = "Resume not found." });
            return Ok(new { message = "Resume deleted." });
        }
    }
}
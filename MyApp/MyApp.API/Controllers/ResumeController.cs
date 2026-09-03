using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyApp.Application.Interfaces;

namespace MyApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ResumeController : ControllerBase
    {
        private readonly IResumeService _resumeService;

        public ResumeController(IResumeService resumeService)
        {
            _resumeService = resumeService;
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
    }
}
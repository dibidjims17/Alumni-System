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

            // Save file to disk
            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "Resumes");
            Directory.CreateDirectory(uploadsFolder);

            var uniqueFileName = $"{GetStudentId()}_{DateTime.UtcNow:yyyyMMddHHmmss}_{file.FileName}";
            var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var result = await _resumeService.UploadResumeAsync(GetStudentId(), file.FileName, filePath, ipAddress);

            return Ok(result);
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
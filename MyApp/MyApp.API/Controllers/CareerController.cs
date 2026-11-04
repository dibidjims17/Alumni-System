using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyApp.Application.Interfaces;
using MyApp.Shared.DTOs;

namespace MyApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CareerController : ControllerBase
    {
        private const long MaxFileSize = 5 * 1024 * 1024;

        private static readonly string[] AllowedImageExtensions =
            { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp" };

        private readonly ICareerService _careerService;

        public CareerController(ICareerService careerService)
        {
            _careerService = careerService;
        }

        private int GetStudentId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        private int GetAdminId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        private bool IsGraduate() =>
            User.FindFirstValue("SchoolYear") == "Graduate";

        private string IpAddress() =>
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        // ------------------------------------------------------------------
        // Student (mobile) endpoints
        // ------------------------------------------------------------------

        // Newest submission, or null when the student has never submitted.
        // Returning 200 with `null` keeps the mobile screen simple: one call
        // distinguishes "no record yet" from an error.
        [Authorize(Roles = "Student")]
        [HttpGet("my-record")]
        public async Task<IActionResult> GetMyRecord()
        {
            if (!IsGraduate()) return Forbid();
            var result = await _careerService.GetMyRecordAsync(GetStudentId());
            return Ok(result);
        }

        // Both documents are mandatory: a certificate of employment and a
        // work ID. Files are validated and written to disk here; the service
        // only ever sees the resulting relative paths.
        [Authorize(Roles = "Student")]
        [HttpPost("proof")]
        public async Task<IActionResult> SubmitProof(
            [FromForm] string employmentStatus,
            [FromForm] string? jobTitle,
            [FromForm] string? company,
            [FromForm] string? industry,
            [FromForm] string? dateStarted,
            IFormFile? certificate,
            IFormFile? workId)
        {
            if (!IsGraduate()) return Forbid();

            var studentId = GetStudentId();

            // Re-submitting without re-picking a document keeps the copy that
            // is already on file, so a user can correct their job details
            // without having to upload both images again.
            var existing = await _careerService.GetMyRecordAsync(studentId);

            var certificateResult = await PrepareImageAsync(certificate, "Certificate of employment",
                existing?.CertificatePath, existing?.CertificateFileName);
            if (!certificateResult.Ok) return BadRequest(new { message = certificateResult.Message });

            var workIdResult = await PrepareImageAsync(workId, "Work ID",
                existing?.WorkIdPath, existing?.WorkIdFileName);
            if (!workIdResult.Ok)
            {
                DeleteQuietly(certificateResult.RelativePath);
                return BadRequest(new { message = workIdResult.Message });
            }

            var request = new CareerSubmitRequest
            {
                EmploymentStatus = employmentStatus,
                JobTitle = jobTitle,
                Company = company,
                Industry = industry,
                DateStarted = ParseDate(dateStarted),
                CertificatePath = certificateResult.RelativePath,
                CertificateFileName = certificateResult.FileName,
                WorkIdPath = workIdResult.RelativePath,
                WorkIdFileName = workIdResult.FileName
            };

            var (success, message, record) = await _careerService.SubmitProofAsync(
                studentId, request, IpAddress());

            if (!success)
            {
                DeleteQuietly(certificateResult.RelativePath);
                DeleteQuietly(workIdResult.RelativePath);
                return BadRequest(new { message });
            }

            return Ok(new { message, record });
        }

        // ------------------------------------------------------------------
        // Admin endpoints
        // ------------------------------------------------------------------

        [Authorize(Roles = "SuperAdmin")]
        [HttpGet]
        public async Task<IActionResult> GetQueue([FromQuery] string? status = null, [FromQuery] string? search = null)
        {
            var result = await _careerService.GetQueueAsync(status, search);
            return Ok(result);
        }

        // Aggregate stats only — Staff see the numbers on their dashboard,
        // but the review queue below stays registrar-only.
        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var result = await _careerService.GetStatsAsync();
            return Ok(result);
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("student/{studentId}")]
        public async Task<IActionResult> GetByStudent(int studentId)
        {
            var result = await _careerService.GetMyRecordAsync(studentId);
            return Ok(result);
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _careerService.GetByIdAsync(id);
            if (result == null) return NotFound(new { message = "Career record not found." });
            return Ok(result);
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPut("{id:int}/review")]
        public async Task<IActionResult> Review(int id, [FromBody] CareerReviewRequest request)
        {
            var (success, message) = await _careerService.ReviewAsync(
                id, request, GetAdminId(), IpAddress());

            if (!success) return BadRequest(new { message });
            return Ok(new { message });
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPost("student/{studentId:int}/remind")]
        public async Task<IActionResult> SendReminder(int studentId)
        {
            var (success, message) = await _careerService.SendReminderAsync(
                studentId, GetAdminId(), IpAddress());

            if (!success) return BadRequest(new { message });
            return Ok(new { message });
        }

        // ------------------------------------------------------------------
        // Helpers
        // ------------------------------------------------------------------

        private sealed record PreparedImage(bool Ok, string Message, string RelativePath, string FileName);

        // Reads the upload into memory once so it can be validated (size,
        // extension, magic bytes) before a single byte reaches disk. When no
        // file was sent, the copy already on file is carried forward instead.
        private async Task<PreparedImage> PrepareImageAsync(
            IFormFile? file, string label, string? existingPath, string? existingFileName)
        {
            if (file == null || file.Length == 0)
            {
                if (!string.IsNullOrWhiteSpace(existingPath))
                    return new PreparedImage(true, string.Empty, existingPath, existingFileName ?? string.Empty);

                return new PreparedImage(false, $"No {label} file provided.", string.Empty, string.Empty);
            }

            if (file.Length > MaxFileSize)
                return new PreparedImage(false, $"{label} must be 5MB or smaller.", string.Empty, string.Empty);

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedImageExtensions.Contains(ext))
                return new PreparedImage(false, $"{label} must be a JPG, PNG, WEBP, GIF or BMP image.", string.Empty, string.Empty);

            byte[] bytes;
            using (var stream = new MemoryStream())
            {
                await file.CopyToAsync(stream);
                bytes = stream.ToArray();
            }

            if (!IsImage(bytes))
                return new PreparedImage(false, $"The uploaded {label} is not a valid image.", string.Empty, string.Empty);

            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "CareerProofs");
            Directory.CreateDirectory(uploadsFolder);

            // Server-generated name — never trust the client filename for the path.
            var storedFileName = $"{GetStudentId()}_{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}{ext}";
            var filePath = Path.Combine(uploadsFolder, storedFileName);
            await System.IO.File.WriteAllBytesAsync(filePath, bytes);

            return new PreparedImage(true, string.Empty,
                $"Uploads/CareerProofs/{storedFileName}",
                SanitizeFileName(file.FileName));
        }

        private static bool IsImage(byte[] bytes)
        {
            if (bytes.Length < 12) return false;

            if (bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF) return true; // JPEG
            if (bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47) return true; // PNG
            if (bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x38) return true; // GIF
            if (bytes[0] == 0x42 && bytes[1] == 0x4D) return true; // BMP
            if (bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') return true; // WEBP

            return false;
        }

        private static DateTime? ParseDate(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            return DateTime.TryParse(value, System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.AssumeUniversal, out var parsed)
                ? DateTime.SpecifyKind(parsed, DateTimeKind.Utc)
                : null;
        }

        private static string SanitizeFileName(string fileName)
        {
            var fallback = "proof.jpg";
            if (string.IsNullOrWhiteSpace(fileName)) return fallback;

            var safe = Path.GetFileName(fileName);
            safe = string.Concat(safe.Split(Path.GetInvalidFileNameChars())).Trim().TrimEnd('.');

            if (string.IsNullOrWhiteSpace(safe)) return fallback;
            return safe.Length > 255 ? safe[..255] : safe;
        }

        private static void DeleteQuietly(string relativePath)
        {
            if (string.IsNullOrWhiteSpace(relativePath)) return;
            try
            {
                var fullPath = Path.Combine(Directory.GetCurrentDirectory(), relativePath);
                if (System.IO.File.Exists(fullPath)) System.IO.File.Delete(fullPath);
            }
            catch { }
        }
    }
}

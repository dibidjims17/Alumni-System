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
    public class NewsSuggestionController : ControllerBase
    {
        private readonly INewsSuggestionService _suggestions;

        public NewsSuggestionController(INewsSuggestionService suggestions)
        {
            _suggestions = suggestions;
        }

        private int GetUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        private string IpAddress() =>
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        // Same rules as news images: 5MB cap, image extensions only,
        // server-generated name under Uploads/News (served via /Uploads
        // and reused as-is when the suggestion is approved into News).
        private async Task<(bool Success, string? ImagePath, string? Error)> SaveImageAsync(IFormFile? image)
        {
            if (image == null || image.Length == 0)
                return (true, null, null);

            if (image.Length > 5 * 1024 * 1024)
                return (false, null, "Image size must not exceed 5MB.");

            var ext = Path.GetExtension(image.FileName).ToLowerInvariant();
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp" };
            if (!allowedExtensions.Contains(ext))
                return (false, null, "Only JPG, PNG, GIF, WEBP and BMP images are allowed.");

            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "News");
            Directory.CreateDirectory(uploadsFolder);

            var storedFileName = $"{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}{ext}";
            var filePath = Path.Combine(uploadsFolder, storedFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await image.CopyToAsync(stream);
            }

            return (true, $"Uploads/News/{storedFileName}", null);
        }

        // ─── Any signed-in user ────────────────────────────────────

        [HttpPost]
        public async Task<IActionResult> Submit([FromForm] SubmitSuggestionRequest request, IFormFile? image)
        {
            var (ok, imagePath, error) = await SaveImageAsync(image);
            if (!ok) return BadRequest(new { message = error });

            var (success, message, suggestion) = await _suggestions.SubmitAsync(
                GetUserId(), request.Title, request.Content, imagePath, IpAddress());
            if (!success) return BadRequest(new { message });
            return Ok(new { message, suggestion });
        }

        [HttpGet("my")]
        public async Task<IActionResult> GetMy([FromQuery] int page = 1)
        {
            var (items, total) = await _suggestions.GetMyAsync(GetUserId(), page);
            return Ok(new { items, total, page, pageSize = 20 });
        }

        // ─── Review queue (SuperAdmin + Staff, matches News roles) ──

        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
            [FromQuery] string? status = null, [FromQuery] string? search = null)
        {
            var (items, total) = await _suggestions.GetAllAsync(page, pageSize, status, search);
            return Ok(new { items, total, page, pageSize });
        }

        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpPut("{id}/review")]
        public async Task<IActionResult> Review(int id, [FromBody] SuggestionReviewRequest request)
        {
            var (success, message) = await _suggestions.ReviewAsync(
                id, request.Status, request.ReviewNote, GetUserId(), IpAddress());
            if (!success) return BadRequest(new { message });
            return Ok(new { message });
        }
    }
}

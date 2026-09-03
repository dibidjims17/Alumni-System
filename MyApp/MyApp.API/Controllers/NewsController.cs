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
    public class NewsController : ControllerBase
    {
        private readonly INewsService _newsService;

        public NewsController(INewsService newsService)
        {
            _newsService = newsService;
        }

        private int GetUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // Validates and saves a news image. Returns (true, path, null) on success,
        // (false, null, errorMessage) when the image fails validation.
        private async Task<(bool Success, string? ImagePath, string? Error)> SaveNewsImageAsync(IFormFile? image)
        {
            if (image == null || image.Length == 0)
                return (true, null, null);

            // Max 5MB
            if (image.Length > 5 * 1024 * 1024)
                return (false, null, "Image size must not exceed 5MB.");

            // Only allow image extensions
            var ext = Path.GetExtension(image.FileName).ToLowerInvariant();
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp" };
            if (!allowedExtensions.Contains(ext))
                return (false, null, "Only JPG, PNG, GIF, WEBP and BMP images are allowed.");

            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "News");
            Directory.CreateDirectory(uploadsFolder);

            // Server-side name is generated (never trust the client filename for the path)
            var storedFileName = $"{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}{ext}";
            var filePath = Path.Combine(uploadsFolder, storedFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await image.CopyToAsync(stream);
            }

            return (true, filePath, null);
        }

        // ─── Alumni endpoints ───────────────────────────────────────

        [HttpGet]
        public async Task<IActionResult> GetNews([FromQuery] int page = 1, [FromQuery] string? search = null)
        {
            var (items, total) = await _newsService.GetNewsAsync(page, GetUserId(), search);
            return Ok(new { items, total, page, pageSize = 10 });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetNewsById(int id)
        {
            var result = await _newsService.GetNewsByIdAsync(id, GetUserId());
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPost("{id}/heart")]
        public async Task<IActionResult> ToggleHeart(int id)
        {
            var hearted = await _newsService.ToggleHeartAsync(id, GetUserId());
            return Ok(new { hearted });
        }

        [HttpPost("{id}/comments")]
        public async Task<IActionResult> AddComment(int id, [FromBody] AddCommentRequest request)
        {
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var result = await _newsService.AddCommentAsync(id, GetUserId(), request, ipAddress);
            return Ok(result);
        }

        // ─── Admin endpoints ────────────────────────────────────────

        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpPost]
        public async Task<IActionResult> CreateNews([FromForm] CreateNewsRequest request, IFormFile? image)
        {
            var (ok, imagePath, error) = await SaveNewsImageAsync(image);
            if (!ok) return BadRequest(new { message = error });

            var result = await _newsService.CreateNewsAsync(request, GetUserId(), imagePath);
            return Ok(result);
        }

        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateNews(int id, [FromForm] CreateNewsRequest request, IFormFile? image)
        {
            var (ok, imagePath, error) = await SaveNewsImageAsync(image);
            if (!ok) return BadRequest(new { message = error });

            var success = await _newsService.UpdateNewsAsync(id, request, imagePath);
            if (!success) return NotFound();
            return Ok(new { message = "News updated successfully." });
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNews(int id)
        {
            var success = await _newsService.SoftDeleteNewsAsync(id);
            if (!success) return NotFound();
            return Ok(new { message = "News moved to trash." });
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("trash")]
        public async Task<IActionResult> GetDeletedNews()
        {
            var result = await _newsService.GetDeletedNewsAsync();
            return Ok(result);
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPut("{id}/restore")]
        public async Task<IActionResult> RestoreNews(int id)
        {
            var success = await _newsService.RestoreNewsAsync(id);
            if (!success) return NotFound();
            return Ok(new { message = "News restored successfully." });
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpDelete("{id}/permanent")]
        public async Task<IActionResult> PermanentlyDeleteNews(int id)
        {
            var success = await _newsService.PermanentlyDeleteNewsAsync(id);
            if (!success) return NotFound();
            return Ok(new { message = "News permanently deleted." });
        }

        [HttpPost("{newsId}/comments/{commentId}/like")]
        public async Task<IActionResult> ToggleCommentLike(int newsId, int commentId)
        {
            var liked = await _newsService.ToggleCommentLikeAsync(commentId, GetUserId());
            return Ok(new { liked });
        }

        [HttpPut("comments/{commentId}")]
        public async Task<IActionResult> EditComment(int commentId, [FromBody] EditCommentRequest request)
        {
            var success = await _newsService.EditCommentAsync(commentId, GetUserId(), request);
            if (!success) return Forbid();
            return Ok(new { message = "Comment updated." });
        }

        [HttpDelete("comments/{commentId}")]
        public async Task<IActionResult> DeleteComment(int commentId)
        {
            var success = await _newsService.DeleteCommentAsync(commentId, GetUserId());
            if (!success) return Forbid();
            return Ok(new { message = "Comment deleted." });
        }

        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpDelete("comments/{commentId}/admin")]
        public async Task<IActionResult> DeleteCommentAsAdmin(int commentId)
        {
            var success = await _newsService.DeleteCommentAsAdminAsync(commentId, GetUserId());
            if (!success) return NotFound();
            return Ok(new { message = "Comment deleted by admin." });
        }
    }
}
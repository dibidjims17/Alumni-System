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

        // ─── Alumni endpoints ───────────────────────────────────────

        [HttpGet]
        public async Task<IActionResult> GetNews([FromQuery] int page = 1)
        {
            var (items, total) = await _newsService.GetNewsAsync(page, GetUserId());
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

        [HttpPost]
        public async Task<IActionResult> CreateNews([FromForm] CreateNewsRequest request, IFormFile? image)
        {
            string? imagePath = null;

            if (image != null && image.Length > 0)
            {
                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "News");
                Directory.CreateDirectory(uploadsFolder);
                var fileName = $"{DateTime.UtcNow:yyyyMMddHHmmss}_{image.FileName}";
                var filePath = Path.Combine(uploadsFolder, fileName);
                using var stream = new FileStream(filePath, FileMode.Create);
                await image.CopyToAsync(stream);
                imagePath = filePath;
            }

            var result = await _newsService.CreateNewsAsync(request, GetUserId(), imagePath);
            return Ok(result);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateNews(int id, [FromForm] CreateNewsRequest request, IFormFile? image)
        {
            string? imagePath = null;

            if (image != null && image.Length > 0)
            {
                var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "News");
                Directory.CreateDirectory(uploadsFolder);
                var fileName = $"{DateTime.UtcNow:yyyyMMddHHmmss}_{image.FileName}";
                var filePath = Path.Combine(uploadsFolder, fileName);
                using var stream = new FileStream(filePath, FileMode.Create);
                await image.CopyToAsync(stream);
                imagePath = filePath;
            }

            var success = await _newsService.UpdateNewsAsync(id, request, imagePath);
            if (!success) return NotFound();
            return Ok(new { message = "News updated successfully." });
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNews(int id)
        {
            var success = await _newsService.DeleteNewsAsync(id);
            if (!success) return NotFound();
            return Ok(new { message = "News deleted successfully." });
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

        [HttpDelete("comments/{commentId}/admin")]
        public async Task<IActionResult> DeleteCommentAsAdmin(int commentId)
        {
            var success = await _newsService.DeleteCommentAsAdminAsync(commentId, GetUserId());
            if (!success) return NotFound();
            return Ok(new { message = "Comment deleted by admin." });
        }
    }
}
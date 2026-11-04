using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyApp.Application.Interfaces;
using MyApp.Shared.DTOs;

namespace MyApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EventsController : ControllerBase
    {
        private readonly IEventService _eventService;
        private const int PageSize = 10;

        public EventsController(IEventService eventService)
        {
            _eventService = eventService;
        }

        private int GetStudentId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // Validates and saves an event flyer. Mirrors NewsController.
        // SaveNewsImageAsync: (true, path, null) on success,
        // (false, null, errorMessage) when the image fails validation.
        private async Task<(bool Success, string? ImagePath, string? Error)> SaveEventImageAsync(IFormFile? image)
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

            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "Events");
            Directory.CreateDirectory(uploadsFolder);

            // Server-side name is generated (never trust the client filename for the path)
            var storedFileName = $"{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}{ext}";
            var filePath = Path.Combine(uploadsFolder, storedFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await image.CopyToAsync(stream);
            }

            // Store a relative path so clients can build a URL from it (Uploads/Events/<file>).
            var relativePath = $"Uploads/Events/{storedFileName}";
            return (true, relativePath, null);
        }

        // ─── Alumni endpoints ─────────────────────────────────────

        [Authorize(Roles = "Student")]
        [HttpGet]
        public async Task<IActionResult> GetUpcomingEvents([FromQuery] int page = 1, [FromQuery] string? search = null)
        {
            var (items, total) = await _eventService.GetUpcomingEventsAsync(page, PageSize, GetStudentId(), search);
            return Ok(new { items, total, page, pageSize = PageSize });
        }

        [Authorize(Roles = "Student")]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetEventById(int id)
        {
            var result = await _eventService.GetEventAsync(id, GetStudentId());
            if (result == null) return NotFound();
            return Ok(result);
        }

        [Authorize(Roles = "Student")]
        [HttpPost("{id}/rsvp")]
        public async Task<IActionResult> ToggleRsvp(int id)
        {
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var (found, rsvped) = await _eventService.ToggleRsvpAsync(id, GetStudentId(), ipAddress);
            if (!found) return NotFound();
            return Ok(new { rsvped });
        }

        // ─── Admin endpoints ──────────────────────────────────────

        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpGet("all")]
        public async Task<IActionResult> GetAllEvents([FromQuery] int page = 1, [FromQuery] string? search = null)
        {
            var (items, total) = await _eventService.GetAllEventsAsync(page, PageSize, search);
            return Ok(new { items, total, page, pageSize = PageSize });
        }

        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpPost]
        public async Task<IActionResult> CreateEvent([FromForm] CreateEventRequest request, IFormFile? image)
        {
            var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var (ok, imagePath, error) = await SaveEventImageAsync(image);
            if (!ok) return BadRequest(new { message = error });

            var result = await _eventService.CreateEventAsync(request, adminId, imagePath);
            return Ok(result);
        }

        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateEvent(int id, [FromForm] CreateEventRequest request, IFormFile? image)
        {
            var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var (ok, imagePath, error) = await SaveEventImageAsync(image);
            if (!ok) return BadRequest(new { message = error });

            var success = await _eventService.UpdateEventAsync(id, request, adminId, imagePath);
            if (!success) return NotFound();
            return Ok(new { message = "Event updated successfully." });
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEvent(int id)
        {
            var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var success = await _eventService.SoftDeleteEventAsync(id, adminId);
            if (!success) return NotFound();
            return Ok(new { message = "Event moved to trash." });
        }

        // Staff may review the trash (monitoring); restoring and permanent
        // deletion stay SuperAdmin-only.
        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpGet("trash")]
        public async Task<IActionResult> GetDeletedEvents()
        {
            var result = await _eventService.GetDeletedEventsAsync();
            return Ok(result);
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPut("{id}/restore")]
        public async Task<IActionResult> RestoreEvent(int id)
        {
            var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var success = await _eventService.RestoreEventAsync(id, adminId);
            if (!success) return NotFound();
            return Ok(new { message = "Event restored successfully." });
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpDelete("{id}/permanent")]
        public async Task<IActionResult> PermanentlyDeleteEvent(int id)
        {
            var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var success = await _eventService.PermanentlyDeleteEventAsync(id, adminId);
            if (!success) return NotFound();
            return Ok(new { message = "Event permanently deleted." });
        }

        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpGet("{id}/attendees")]
        public async Task<IActionResult> GetAttendees(int id)
        {
            var attendees = await _eventService.GetAttendeesAsync(id);
            if (attendees == null) return NotFound();
            return Ok(attendees);
        }
    }
}

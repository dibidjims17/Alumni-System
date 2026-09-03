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
            var (found, rsvped) = await _eventService.ToggleRsvpAsync(id, GetStudentId());
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
        public async Task<IActionResult> CreateEvent([FromBody] CreateEventRequest request)
        {
            var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _eventService.CreateEventAsync(request, adminId);
            return Ok(result);
        }

        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateEvent(int id, [FromBody] CreateEventRequest request)
        {
            var success = await _eventService.UpdateEventAsync(id, request);
            if (!success) return NotFound();
            return Ok(new { message = "Event updated successfully." });
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEvent(int id)
        {
            var success = await _eventService.DeleteEventAsync(id);
            if (!success) return NotFound();
            return Ok(new { message = "Event deleted." });
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

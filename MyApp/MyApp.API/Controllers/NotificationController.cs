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
    public class NotificationController : ControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        private int GetStudentId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        [HttpGet]
        public async Task<IActionResult> GetMyNotifications()
        {
            var result = await _notificationService.GetMyNotificationsAsync(GetStudentId());
            return Ok(result);
        }

        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            var count = await _notificationService.GetUnreadCountAsync(GetStudentId());
            return Ok(new { count });
        }

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var success = await _notificationService.MarkAsReadAsync(id, GetStudentId());
            if (!success) return NotFound();
            return Ok(new { message = "Marked as read." });
        }

        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            await _notificationService.MarkAllAsReadAsync(GetStudentId());
            return Ok(new { message = "All notifications marked as read." });
        }

        // Registers this device's Expo push token for the logged-in student.
        [HttpPut("push-token")]
        public async Task<IActionResult> RegisterPushToken([FromBody] RegisterPushTokenRequest request)
        {
            await _notificationService.RegisterPushTokenAsync(GetStudentId(), request.Token, request.Platform);
            return Ok(new { message = "Push token registered." });
        }

        [HttpPost("push-token/unregister")]
        public async Task<IActionResult> UnregisterPushToken([FromBody] RegisterPushTokenRequest request)
        {
            await _notificationService.UnregisterPushTokenAsync(request.Token);
            return Ok(new { message = "Push token removed." });
        }
    }
}
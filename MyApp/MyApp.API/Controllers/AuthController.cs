using Microsoft.AspNetCore.Mvc;
using MyApp.Application.Interfaces;
using MyApp.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;

namespace MyApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var result = await _authService.LoginAsync(request, ipAddress);

            if (result == null)
                return Unauthorized(new { message = "Invalid student number or password." });

            return Ok(result);
        }

        [HttpPost("change-password")]
        [Authorize] // student must be logged in
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var studentIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (studentIdClaim == null || !int.TryParse(studentIdClaim, out var studentId))
                return Unauthorized();

            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var success = await _authService.ChangePasswordAsync(studentId, request, ipAddress);

            if (!success)
                return BadRequest(new { message = "Current password is incorrect." });

            return Ok(new { message = "Password changed successfully." });
        }

        // ⚠️ TEMPORARY — FOR LOCAL TESTING ONLY. Remove before any deployment/demo.
        [HttpPost("debug-reset-password")]
        public async Task<IActionResult> DebugResetPassword([FromQuery] string studentNumber)
        {
            var student = await _authService.DebugResetPasswordAsync(studentNumber);
            if (student == null)
                return NotFound(new { message = "Student not found." });

            return Ok(new
            {
                message = $"Password reset for {studentNumber}.",
                studentNumber = student.StudentNumber,
                newPassword = studentNumber, // password = student number, matches your default-password rule
                mustChangePassword = true
            });
        }
    }
}
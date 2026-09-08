using Microsoft.AspNetCore.Mvc;
using MyApp.Application.Interfaces;
using MyApp.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;

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
        [EnableRateLimiting("auth")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var result = await _authService.LoginAsync(request, ipAddress);

            if (result == null)
                return Unauthorized(new { message = "Invalid student number or password." });

            if (result.TemporaryPasswordExpired)
                return Unauthorized(new { message = "Temporary password expired. Use Forgot Password to set a new one." });

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
            var (success, message) = await _authService.ChangePasswordAsync(studentId, request, ipAddress);

            if (!success)
                return BadRequest(new { message });

            return Ok(new { message });
        }

        [HttpPost("forgot-password")]
        [EnableRateLimiting("auth")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            await _authService.ForgotPasswordAsync(request);
            return Ok(new { message = "If that email is registered, a reset code has been sent." });
        }

        [HttpPost("reset-password")]
        [EnableRateLimiting("auth")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            var success = await _authService.ResetPasswordAsync(request);
            if (!success)
                return BadRequest(new { message = "Invalid or expired reset code." });

            return Ok(new { message = "Password reset successfully." });
        }
    }
}
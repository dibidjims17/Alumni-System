using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MyApp.Application.Interfaces;
using MyApp.Shared.DTOs;
using System.Security.Claims;

namespace MyApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminAuthService _adminAuthService;
        private readonly IAdminManagementService _adminManagementService;

        public AdminController(
            IAdminAuthService adminAuthService,
            IAdminManagementService adminManagementService)
        {
            _adminAuthService = adminAuthService;
            _adminManagementService = adminManagementService;
        }

        [HttpPost("login")]
        [EnableRateLimiting("auth")]
        public async Task<IActionResult> Login([FromBody] AdminLoginRequest request)
        {
            var result = await _adminAuthService.LoginAsync(request);
            if (result == null)
                return Unauthorized(new { message = "Invalid username or password." });
            return Ok(result);
        }

        [HttpPost("forgot-password")]
        [EnableRateLimiting("auth")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            await _adminAuthService.ForgotPasswordAsync(request);
            return Ok(new { message = "If that email is registered, a reset code has been sent." });
        }

        [HttpPost("reset-password")]
        [EnableRateLimiting("auth")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            var success = await _adminAuthService.ResetPasswordAsync(request);
            if (!success)
                return BadRequest(new { message = "Invalid or expired reset code." });

            return Ok(new { message = "Password reset successfully." });
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpGet]
        public async Task<IActionResult> GetAllAdmins()
        {
            var result = await _adminManagementService.GetAllAdminsAsync();
            return Ok(result);
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPost]
        public async Task<IActionResult> CreateAdmin([FromBody] CreateAdminRequest request)
        {
            var result = await _adminManagementService.CreateAdminAsync(request);
            if (result == null)
                return BadRequest(new { message = "Username already exists." });
            return Ok(result);
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPut("{id}/toggle-status")]
        public async Task<IActionResult> ToggleAdminStatus(int id)
        {
            var requestingAdminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var success = await _adminManagementService.ToggleAdminStatusAsync(id, requestingAdminId);
            if (!success) return BadRequest(new { message = "Cannot deactivate your own account or the last active SuperAdmin." });
            return Ok(new { message = "Admin status updated." });
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPut("{id}/role")]
        public async Task<IActionResult> UpdateAdminRole(int id, [FromBody] UpdateAdminRoleRequest request)
        {
            var requestingAdminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var success = await _adminManagementService.UpdateAdminRoleAsync(id, request.Role, requestingAdminId);
            if (!success) return BadRequest(new { message = "Cannot change your own role, remove the last SuperAdmin, or invalid role." });
            return Ok(new { message = "Admin role updated." });
        }
    }
}
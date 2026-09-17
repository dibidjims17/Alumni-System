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
            var (success, message) = await _adminAuthService.ResetPasswordAsync(request);
            if (!success)
                return BadRequest(new { message });

            return Ok(new { message });
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpGet]
        public async Task<IActionResult> GetAllAdmins()
        {
            var result = await _adminManagementService.GetAllAdminsAsync();
            return Ok(result);
        }

        // Self-service profile endpoints — any signed-in admin or staffer,
        // always scoped to the caller's own account.
        private int GetOwnId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpGet("me")]
        public async Task<IActionResult> GetMyProfile()
        {
            var result = await _adminManagementService.GetAdminByIdAsync(GetOwnId());
            if (result == null) return NotFound(new { message = "Account not found." });
            return Ok(result);
        }

        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpPut("me/profile")]
        public async Task<IActionResult> UpdateMyProfile([FromBody] UpdateAdminProfileRequest request)
        {
            var ownId = GetOwnId();
            var (success, message) = await _adminManagementService.UpdateAdminProfileAsync(
                ownId, request, ownId, User.IsInRole("SuperAdmin"));
            if (!success) return BadRequest(new { message });
            var updated = await _adminManagementService.GetAdminByIdAsync(ownId);
            return Ok(updated);
        }

        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpPost("me/picture")]
        public async Task<IActionResult> UploadMyPicture(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file provided." });

            // Max 5MB
            if (file.Length > 5 * 1024 * 1024)
                return BadRequest(new { message = "Image size must not exceed 5MB." });

            // Only allow image extensions
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp" };
            if (!allowedExtensions.Contains(ext))
                return BadRequest(new { message = "Only JPG, PNG, GIF, WEBP and BMP images are allowed." });

            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "AdminPictures");
            Directory.CreateDirectory(uploadsFolder);

            // Server-side name is generated (never trust the client filename for the path)
            var ownId = GetOwnId();
            var storedFileName = $"admin_{ownId}_{Guid.NewGuid():N}{ext}";
            var filePath = Path.Combine(uploadsFolder, storedFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var relativePath = $"Uploads/AdminPictures/{storedFileName}";
            var (success, relative, message) = await _adminManagementService.UpdateAdminPictureAsync(ownId, relativePath, filePath, ownId);
            if (!success) return NotFound(new { message });
            return Ok(new { profilePicturePath = relative });
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPost]
        public async Task<IActionResult> CreateAdmin([FromBody] CreateAdminRequest request)
        {
            var requestingAdminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _adminManagementService.CreateAdminAsync(request, requestingAdminId);
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

        [Authorize(Roles = "SuperAdmin")]
        [HttpPut("{id}/profile")]
        public async Task<IActionResult> UpdateAdminProfile(int id, [FromBody] UpdateAdminProfileRequest request)
        {
            var requestingAdminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var requestingIsSuperAdmin = User.IsInRole("SuperAdmin");
            var (success, message) = await _adminManagementService.UpdateAdminProfileAsync(id, request, requestingAdminId, requestingIsSuperAdmin);
            if (!success) return BadRequest(new { message });
            var admins = await _adminManagementService.GetAllAdminsAsync();
            return Ok(admins.FirstOrDefault(a => a.Id == id));
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPost("{id}/picture")]
        public async Task<IActionResult> UploadAdminPicture(int id, IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file provided." });

            // Max 5MB
            if (file.Length > 5 * 1024 * 1024)
                return BadRequest(new { message = "Image size must not exceed 5MB." });

            // Only allow image extensions
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp" };
            if (!allowedExtensions.Contains(ext))
                return BadRequest(new { message = "Only JPG, PNG, GIF, WEBP and BMP images are allowed." });

            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "AdminPictures");
            Directory.CreateDirectory(uploadsFolder);

            // Server-side name is generated (never trust the client filename for the path)
            var storedFileName = $"admin_{id}_{Guid.NewGuid():N}{ext}";
            var filePath = Path.Combine(uploadsFolder, storedFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var relativePath = $"Uploads/AdminPictures/{storedFileName}";
            var requestingAdminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var (success, relative, message) = await _adminManagementService.UpdateAdminPictureAsync(id, relativePath, filePath, requestingAdminId);
            if (!success) return NotFound(new { message });
            return Ok(new { profilePicturePath = relative });
        }
    }
}
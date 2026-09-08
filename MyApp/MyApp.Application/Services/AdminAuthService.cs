using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using MyApp.Application.Interfaces;
using MyApp.Shared.DTOs;

namespace MyApp.Application.Services
{
    public class AdminAuthService : IAdminAuthService
    {
        private readonly IAdminRepository _adminRepository;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;
        private readonly IActivityLogRepository _activityLogRepository;

        public AdminAuthService(
            IAdminRepository adminRepository,
            IConfiguration configuration,
            IEmailService emailService,
            IActivityLogRepository activityLogRepository)
        {
            _adminRepository = adminRepository;
            _configuration = configuration;
            _emailService = emailService;
            _activityLogRepository = activityLogRepository;
        }

        public async Task<AdminLoginResponse?> LoginAsync(AdminLoginRequest request)
        {
            // 1. Find admin by username or email — the Username field carries
            // whichever identifier the user typed (an "@" means email).
            var identifier = (request.Username ?? string.Empty).Trim();
            var admin = identifier.Contains('@')
                ? await _adminRepository.GetByEmailAsync(identifier)
                : await _adminRepository.GetByUsernameAsync(identifier);
            if (admin == null || !admin.IsActive)
                return null;

            // 2. Verify password (a corrupt hash must fail closed, not 500)
            bool passwordOk;
            try
            {
                passwordOk = BCrypt.Net.BCrypt.Verify(request.Password, admin.PasswordHash);
            }
            catch
            {
                return null;
            }
            if (!passwordOk)
                return null;

            // 3. Update last login
            admin.LastLoginAt = DateTime.UtcNow;
            await _adminRepository.UpdateAsync(admin);

            await _activityLogRepository.LogAdminAsync(admin.Id, "ADMIN_LOGIN", $"Admin logged in: {admin.Username}", "system");

            // 4. Generate token
            var token = GenerateToken(admin);

            return new AdminLoginResponse
            {
                Token = token,
                FullName = admin.FullName,
                Username = admin.Username,
                Role = admin.Role,
                ProfilePicturePath = admin.ProfilePicturePath
            };
        }

        public async Task ForgotPasswordAsync(ForgotPasswordRequest request)
        {
            var admin = await _adminRepository.GetByEmailAsync(request.Identifier);

            // Same enumeration-safe behavior as the student flow: identical
            // response whether or not the email matched an active admin.
            if (admin == null || !admin.IsActive)
                return;

            var code = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
            admin.PasswordResetCode = HashResetCode(code);
            admin.PasswordResetCodeExpiry = DateTime.UtcNow.AddMinutes(15);
            await _adminRepository.UpdateAsync(admin);

            var (plain, html) = MyApp.Shared.EmailTemplates.ResetCode(code, forAdmin: true);
            await _emailService.SendEmailAsync(admin.Email, "Admin Password Reset Code", plain, html);
        }

        public async Task<(bool Success, string Message)> ResetPasswordAsync(ResetPasswordRequest request)
        {
            var admin = await _adminRepository.GetByEmailAsync(request.Identifier);
            if (admin == null || !admin.IsActive)
                return (false, "Invalid or expired reset code.");

            if (admin.PasswordResetCode == null
                || string.IsNullOrWhiteSpace(request.Code)
                || !VerifyResetCode(request.Code, admin.PasswordResetCode))
                return (false, "Invalid or expired reset code.");

            if (admin.PasswordResetCodeExpiry == null || admin.PasswordResetCodeExpiry < DateTime.UtcNow)
                return (false, "Invalid or expired reset code.");

            var (ruleOk, ruleMessage) = MyApp.Shared.PasswordRules.Check(request.NewPassword);
            if (!ruleOk)
                return (false, ruleMessage);

            admin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            admin.PasswordResetCode = null;
            admin.PasswordResetCodeExpiry = null;
            await _adminRepository.UpdateAsync(admin);

            return (true, "Password reset successfully.");
        }

        // Only the SHA-256 hash of the code is stored, so a database leak never
        // exposes usable reset codes.
        private static string HashResetCode(string code)
        {
            var hash = SHA256.HashData(Encoding.UTF8.GetBytes(code));
            return Convert.ToHexString(hash);
        }

        private static bool VerifyResetCode(string code, string storedHash)
        {
            var candidate = HashResetCode(code);
            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(candidate),
                Encoding.UTF8.GetBytes(storedHash));
        }

        private string GenerateToken(MyApp.Domain.Entities.Admin admin)
        {
            var jwtKey = _configuration["Jwt:Key"]!;
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, admin.Id.ToString()),
                new Claim(ClaimTypes.Name, admin.Username),
                new Claim(ClaimTypes.Role, admin.Role)
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8), // shorter expiry for admin
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
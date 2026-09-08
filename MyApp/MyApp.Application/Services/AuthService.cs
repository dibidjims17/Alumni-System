using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Shared.DTOs;

namespace MyApp.Application.Services
{
    public class AuthService : IAuthService
    {
        private readonly IStudentRepository _studentRepository;
        private readonly IActivityLogRepository _activityLogRepository;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;

        public AuthService(
            IStudentRepository studentRepository,
            IActivityLogRepository activityLogRepository,
            IConfiguration configuration,
            IEmailService emailService)
        {
            _studentRepository = studentRepository;
            _activityLogRepository = activityLogRepository;
            _configuration = configuration;
            _emailService = emailService;
        }

        public async Task<LoginResponse?> LoginAsync(LoginRequest request, string ipAddress)
        {
            // 1. Find student by student number or email
            var student = await _studentRepository.GetByStudentNumberAsync(request.Identifier)
                ?? await _studentRepository.GetByEmailAsync(request.Identifier);
            if (student == null || !student.IsActive)
                return null;

            // 2. Verify password (a corrupt hash must fail closed, not 500)
            bool passwordOk;
            try
            {
                passwordOk = BCrypt.Net.BCrypt.Verify(request.Password, student.PasswordHash);
            }
            catch
            {
                return null;
            }
            if (!passwordOk)
                return null;

            // Temporary passwords die after their window — the holder must go
            // through Forgot Password instead. Signalled explicitly (not a
            // generic null) so the client can explain why.
            if (student.MustChangePassword
                && student.TemporaryPasswordExpiry != null
                && student.TemporaryPasswordExpiry < DateTime.UtcNow)
            {
                return new LoginResponse { TemporaryPasswordExpired = true };
            }

            // 3. Log the activity
            await _activityLogRepository.LogStudentAsync(student.Id, "LOGIN", "Student logged in", ipAddress);

            // 4. Generate JWT token
            var token = GenerateToken(student);

            return new LoginResponse
            {
                Id = student.Id,
                Token = token,
                FullName = student.FullName,
                StudentNumber = student.StudentNumber,
                Program = student.Program,
                SchoolYear = student.SchoolYear,
                MustChangePassword = student.MustChangePassword
            };
        }

        private string GenerateToken(MyApp.Domain.Entities.Student student)
        {
            var jwtKey = _configuration["Jwt:Key"]!;
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, student.Id.ToString()),
                new Claim(ClaimTypes.Name, student.StudentNumber),
                new Claim(ClaimTypes.Role, "Student"),
                new Claim("SchoolYear", student.SchoolYear)
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public async Task<(bool Success, string Message)> ChangePasswordAsync(int studentId, ChangePasswordRequest request, string ipAddress)
        {
            // 1. Find student
            var student = await _studentRepository.GetByIdAsync(studentId);
            if (student == null || !student.IsActive)
                return (false, "Account not found.");

            // 2. Verify current password
            bool currentOk;
            try
            {
                currentOk = BCrypt.Net.BCrypt.Verify(request.CurrentPassword, student.PasswordHash);
            }
            catch
            {
                return (false, "Current password is incorrect.");
            }
            if (!currentOk)
                return (false, "Current password is incorrect.");

            // 3. Validate the replacement (mirrors the mobile client rules)
            if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
                return (false, "New password must be at least 6 characters.");
            if (request.NewPassword == request.CurrentPassword)
                return (false, "New password must be different from the current password.");

            // 4. Hash and set new password
            student.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            student.MustChangePassword = false;
            student.TemporaryPasswordExpiry = null;

            await _studentRepository.UpdateAsync(student);

            // 5. Log the activity
            await _activityLogRepository.LogStudentAsync(studentId, "CHANGE_PASSWORD", "Student changed password", ipAddress);

            return (true, "Password changed successfully.");
        }

        public async Task ForgotPasswordAsync(ForgotPasswordRequest request)
        {
            var student = await _studentRepository.GetByEmailAsync(request.Identifier);

            // Always behave the same whether or not the email matched a real
            // student — prevents attackers from using this endpoint to discover
            // which emails are registered in the system.
            if (student == null || !student.IsActive)
                return;

            var code = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
            student.PasswordResetCode = HashResetCode(code);
            student.PasswordResetCodeExpiry = DateTime.UtcNow.AddMinutes(15);
            await _studentRepository.UpdateAsync(student);

            var body = $"Your password reset code is: {code}\n\nThis code expires in 15 minutes. If you did not request this, you can safely ignore this email.";
            await _emailService.SendEmailAsync(student.Email, "Password Reset Code", body);
        }

        public async Task<bool> ResetPasswordAsync(ResetPasswordRequest request)
        {
            var student = await _studentRepository.GetByEmailAsync(request.Identifier);
            if (student == null || !student.IsActive)
                return false;

            if (student.PasswordResetCode == null
                || string.IsNullOrWhiteSpace(request.Code)
                || !VerifyResetCode(request.Code, student.PasswordResetCode))
                return false;

            if (student.PasswordResetCodeExpiry == null || student.PasswordResetCodeExpiry < DateTime.UtcNow)
                return false;

            student.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            student.MustChangePassword = false;
            student.PasswordResetCode = null;
            student.PasswordResetCodeExpiry = null;
            student.TemporaryPasswordExpiry = null;
            await _studentRepository.UpdateAsync(student);

            return true;
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
    }
}
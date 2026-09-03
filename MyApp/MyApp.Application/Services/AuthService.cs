using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
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

            // 2. Verify password
            if (!BCrypt.Net.BCrypt.Verify(request.Password, student.PasswordHash))
                return null;

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

        public async Task<bool> ChangePasswordAsync(int studentId, ChangePasswordRequest request, string ipAddress)
        {
            // 1. Find student
            var student = await _studentRepository.GetByIdAsync(studentId);
            if (student == null || !student.IsActive)
                return false;

            // 2. Verify current password
            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, student.PasswordHash))
                return false;

            // 3. Hash and set new password
            student.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            student.MustChangePassword = false;

            await _studentRepository.UpdateAsync(student);

            // 4. Log the activity
            await _activityLogRepository.LogStudentAsync(studentId, "CHANGE_PASSWORD", "Student changed password", ipAddress);

            return true;
        }

        public async Task ForgotPasswordAsync(ForgotPasswordRequest request)
        {
            var student = await _studentRepository.GetByEmailAsync(request.Identifier);

            // Always behave the same whether or not the email matched a real
            // student — prevents attackers from using this endpoint to discover
            // which emails are registered in the system.
            if (student == null || !student.IsActive)
                return;

            var code = new Random().Next(100000, 999999).ToString();
            student.PasswordResetCode = code;
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

            if (student.PasswordResetCode == null || student.PasswordResetCode != request.Code)
                return false;

            if (student.PasswordResetCodeExpiry == null || student.PasswordResetCodeExpiry < DateTime.UtcNow)
                return false;

            student.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            student.MustChangePassword = false;
            student.PasswordResetCode = null;
            student.PasswordResetCodeExpiry = null;
            await _studentRepository.UpdateAsync(student);

            return true;
        }
    }
}
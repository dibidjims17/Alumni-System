using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
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

        public AdminAuthService(
            IAdminRepository adminRepository,
            IConfiguration configuration)
        {
            _adminRepository = adminRepository;
            _configuration = configuration;
        }

        public async Task<AdminLoginResponse?> LoginAsync(AdminLoginRequest request)
        {
            // 1. Find admin
            var admin = await _adminRepository.GetByUsernameAsync(request.Username);
            if (admin == null || !admin.IsActive)
                return null;

            // 2. Verify password
            if (!BCrypt.Net.BCrypt.Verify(request.Password, admin.PasswordHash))
                return null;

            // 3. Update last login
            admin.LastLoginAt = DateTime.UtcNow;
            await _adminRepository.UpdateAsync(admin);

            // 4. Generate token
            var token = GenerateToken(admin);

            return new AdminLoginResponse
            {
                Token = token,
                FullName = admin.FullName,
                Username = admin.Username,
                Role = admin.Role
            };
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
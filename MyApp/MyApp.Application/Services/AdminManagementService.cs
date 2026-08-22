using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Shared.DTOs;

namespace MyApp.Application.Services
{
    public class AdminManagementService : IAdminManagementService
    {
        private readonly IAdminRepository _adminRepository;

        public AdminManagementService(IAdminRepository adminRepository)
        {
            _adminRepository = adminRepository;
        }

        public async Task<List<AdminDto>> GetAllAdminsAsync()
        {
            var admins = await _adminRepository.GetAllAsync();
            return admins.Select(a => new AdminDto
            {
                Id = a.Id,
                Username = a.Username,
                FullName = a.FullName,
                Email = a.Email,
                Role = a.Role,
                IsActive = a.IsActive,
                CreatedAt = a.CreatedAt,
                LastLoginAt = a.LastLoginAt
            }).ToList();
        }

        public async Task<AdminDto?> CreateAdminAsync(CreateAdminRequest request)
        {
            var existing = await _adminRepository.GetByUsernameAsync(request.Username);
            if (existing != null) return null; // username already taken

            var admin = new Admin
            {
                Username = request.Username,
                FullName = request.FullName,
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = request.Role == "SuperAdmin" ? "SuperAdmin" : "Staff",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _adminRepository.CreateAsync(admin);

            return new AdminDto
            {
                Id = admin.Id,
                Username = admin.Username,
                FullName = admin.FullName,
                Email = admin.Email,
                Role = admin.Role,
                IsActive = admin.IsActive,
                CreatedAt = admin.CreatedAt,
                LastLoginAt = admin.LastLoginAt
            };
        }

        public async Task<bool> ToggleAdminStatusAsync(int adminId, int requestingAdminId)
        {
            var admin = await _adminRepository.GetByIdAsync(adminId);
            if (admin == null) return false;

            // Prevent self-deactivation
            if (adminId == requestingAdminId)
                return false;

            // If deactivating, ensure at least one other active SuperAdmin remains
            if (admin.IsActive && admin.Role == "SuperAdmin")
            {
                var allAdmins = await _adminRepository.GetAllAsync();
                var activeSuperAdmins = allAdmins.Count(a => a.Role == "SuperAdmin" && a.IsActive);
                if (activeSuperAdmins <= 1)
                    return false; // would leave zero active SuperAdmins
            }

            admin.IsActive = !admin.IsActive;
            await _adminRepository.UpdateAsync(admin);
            return true;
        }

        public async Task<bool> UpdateAdminRoleAsync(int adminId, string newRole)
        {
            if (newRole != "SuperAdmin" && newRole != "Staff") return false;

            var admin = await _adminRepository.GetByIdAsync(adminId);
            if (admin == null) return false;

            admin.Role = newRole;
            await _adminRepository.UpdateAsync(admin);
            return true;
        }
    }
}
using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Shared.DTOs;

namespace MyApp.Application.Services
{
    public class AdminManagementService : IAdminManagementService
    {
        private readonly IAdminRepository _adminRepository;
        private readonly IEmailService _emailService;

        public AdminManagementService(IAdminRepository adminRepository, IEmailService emailService)
        {
            _adminRepository = adminRepository;
            _emailService = emailService;
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

            // Welcome email with the initial credentials — best effort, a
            // mail failure must not roll back the created account.
            try
            {
                var body = $"Hello {admin.FullName},\n\nAn administrator account has been created for you on the School Alumni Portal.\n\nUsername: {admin.Username}\nTemporary password: {request.Password}\nRole: {admin.Role}\n\nPlease log in and change your password. If you did not expect this account, contact your administrator.";
                await _emailService.SendEmailAsync(admin.Email, "Your Alumni Portal admin account", body);
            }
            catch
            {
                // EmailService already swallows transport errors; this guards
                // against anything unexpected in body construction.
            }

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

        public async Task<bool> UpdateAdminRoleAsync(int adminId, string newRole, int requestingAdminId)
        {
            if (newRole != "SuperAdmin" && newRole != "Staff") return false;

            var admin = await _adminRepository.GetByIdAsync(adminId);
            if (admin == null) return false;

            // Prevent self-demotion (matches the client-side lock).
            if (adminId == requestingAdminId)
                return false;

            // Demoting the last active SuperAdmin would lock administration out.
            if (admin.Role == "SuperAdmin" && newRole == "Staff" && admin.IsActive)
            {
                var allAdmins = await _adminRepository.GetAllAsync();
                var activeSuperAdmins = allAdmins.Count(a => a.Role == "SuperAdmin" && a.IsActive);
                if (activeSuperAdmins <= 1)
                    return false;
            }

            admin.Role = newRole;
            await _adminRepository.UpdateAsync(admin);
            return true;
        }
    }
}
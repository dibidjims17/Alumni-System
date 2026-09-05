using MyApp.Shared.DTOs;

namespace MyApp.Application.Interfaces
{
    public interface IAdminManagementService
    {
        Task<List<AdminDto>> GetAllAdminsAsync();
        Task<AdminDto?> CreateAdminAsync(CreateAdminRequest request);
        Task<bool> ToggleAdminStatusAsync(int adminId, int requestingAdminId);
        Task<bool> UpdateAdminRoleAsync(int adminId, string newRole, int requestingAdminId);
    }
}
using MyApp.Domain.Entities;

namespace MyApp.Application.Interfaces
{
    public interface IAdminRepository
    {
        Task<Admin?> GetByUsernameAsync(string username);
        Task<Admin?> GetByIdAsync(int id);
        Task UpdateAsync(Admin admin);
    }
}
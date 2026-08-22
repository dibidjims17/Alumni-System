using MyApp.Domain.Entities;
namespace MyApp.Application.Interfaces
{
    public interface IAdminRepository
    {
        Task<Admin?> GetByUsernameAsync(string username);
        Task<Admin?> GetByIdAsync(int id);
        Task<List<Admin>> GetAllAsync();
        Task CreateAsync(Admin admin);
        Task UpdateAsync(Admin admin);
    }
}
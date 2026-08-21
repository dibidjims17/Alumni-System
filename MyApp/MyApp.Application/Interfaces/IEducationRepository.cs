using MyApp.Domain.Entities;

namespace MyApp.Application.Interfaces
{
    public interface IEducationRepository
    {
        Task<List<Education>> GetByStudentIdAsync(int studentId);
        Task<Education?> GetByIdAsync(int id);
        Task CreateAsync(Education education);
        Task UpdateAsync(Education education);
        Task DeleteAsync(Education education);
    }
}
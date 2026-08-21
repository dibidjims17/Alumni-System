using MyApp.Domain.Entities;

namespace MyApp.Application.Interfaces
{
    public interface IResumeRepository
    {
        Task<List<Resume>> GetByStudentIdAsync(int studentId);
        Task<Resume?> GetActiveByStudentIdAsync(int studentId);
        Task<Resume?> GetByIdAsync(int id);
        Task CreateAsync(Resume resume);
        Task UpdateAsync(Resume resume);
        Task DeactivateAllAsync(int studentId);
    }
}
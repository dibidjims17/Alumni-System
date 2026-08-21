using MyApp.Domain.Entities;

namespace MyApp.Application.Interfaces
{
    public interface IWorkExperienceRepository
    {
        Task<List<WorkExperience>> GetByStudentIdAsync(int studentId);
        Task<WorkExperience?> GetByIdAsync(int id);
        Task CreateAsync(WorkExperience workExperience);
        Task UpdateAsync(WorkExperience workExperience);
        Task DeleteAsync(WorkExperience workExperience);
    }
}
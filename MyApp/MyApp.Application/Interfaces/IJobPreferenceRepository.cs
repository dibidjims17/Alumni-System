using MyApp.Domain.Entities;

namespace MyApp.Application.Interfaces
{
    public interface IJobPreferenceRepository
    {
        Task<JobPreference?> GetByStudentIdAsync(int studentId);
        Task CreateAsync(JobPreference preference);
        Task UpdateAsync(JobPreference preference);
    }
}
using MyApp.Domain.Entities;

namespace MyApp.Application.Interfaces
{
    public interface IJobRepository
    {
        Task<List<Job>> GetActiveAsync(int page, int pageSize);
        Task<int> GetTotalCountAsync();
        Task<Job?> GetByIdAsync(int id);
        Task CreateAsync(Job job);
        Task UpdateAsync(Job job);
        Task DeleteAsync(Job job);
        Task<int> GetActiveCountAsync();

        // Applications
        Task<JobApplication?> GetApplicationAsync(int jobId, int studentId);
        Task<JobApplication?> GetApplicationByIdAsync(int applicationId);
        Task<List<JobApplication>> GetApplicationsByJobIdAsync(int jobId);
        Task<List<JobApplication>> GetApplicationsByStudentIdAsync(int studentId);
        Task CreateApplicationAsync(JobApplication application);
        Task UpdateApplicationAsync(JobApplication application);

        // Deleted
        Task<Job?> GetByIdIncludingDeletedAsync(int id);
        Task<List<Job>> GetDeletedAsync();
    }
}
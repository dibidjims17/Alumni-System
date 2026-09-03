using MyApp.Shared.DTOs;

namespace MyApp.Application.Interfaces
{
    public interface IJobService
    {
        Task<(List<JobDto> Items, int TotalCount)> GetJobsAsync(int page, int studentId, string? search = null, decimal? minSalary = null, decimal? maxSalary = null);
        Task<JobDto?> GetJobByIdAsync(int jobId, int studentId);
        Task<JobDto> CreateJobAsync(CreateJobRequest request, int adminId);
        Task<bool> UpdateJobAsync(int jobId, CreateJobRequest request);
        Task<bool> DeleteJobAsync(int jobId);

        Task<(bool Success, string Message)> ApplyToJobAsync(int jobId, int studentId, ApplyJobRequest request, string ipAddress);
        Task<List<JobApplicationDto>> GetMyApplicationsAsync(int studentId);
        Task<List<ApplicantDto>?> GetApplicantsAsync(int jobId);
        Task<bool> UpdateApplicationStatusAsync(int applicationId, UpdateApplicationStatusRequest request, int adminId);
        Task<List<JobApplicationHistoryDto>?> GetApplicationHistoryAsync(int applicationId);
        Task<List<JobApplicationHistoryDto>?> GetMyApplicationHistoryAsync(int applicationId, int studentId);

        Task<bool> SoftDeleteJobAsync(int id);
        Task<bool> RestoreJobAsync(int id);
        Task<bool> PermanentlyDeleteJobAsync(int id);
        Task<List<JobDto>> GetDeletedJobsAsync();

        Task<List<ApplicantDto>?> GetApplicantsForExportAsync(int jobId, List<string>? statuses);
    }
}
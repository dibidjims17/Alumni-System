using MyApp.Shared.DTOs;

namespace MyApp.Application.Interfaces
{
    public interface IResumeService
    {
        Task<List<ResumeDto>> GetResumesAsync(int studentId);
        Task<ResumeDto?> GetResumeByIdAsync(int resumeId);
        Task<ResumeDto?> GetActiveResumeAsync(int studentId);
        Task<ResumeDto> UploadResumeAsync(int studentId, string fileName, string filePath, string ipAddress);
    }
}
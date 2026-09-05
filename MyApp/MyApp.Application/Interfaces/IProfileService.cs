using MyApp.Shared.DTOs;

namespace MyApp.Application.Interfaces
{
    public interface IProfileService
    {
        Task<AlumniProfileDto?> GetProfileAsync(int studentId);
        Task<bool> UpdateProfileAsync(int studentId, UpdateProfileRequest request, string ipAddress);
        Task<string> UploadProfilePictureAsync(int studentId, string relativePath, string ipAddress);
        Task<bool> DeleteProfilePictureAsync(int studentId, string ipAddress);
        Task<JobPreferenceDto?> GetJobPreferencesAsync(int studentId);
        Task<bool> UpdateJobPreferencesAsync(int studentId, JobPreferenceDto request, string ipAddress);
        Task AddWorkExperienceAsync(int studentId, WorkExperienceDto request, string ipAddress);
        Task<bool> UpdateWorkExperienceAsync(int studentId, int workExperienceId, WorkExperienceDto request, string ipAddress);
        Task<bool> DeleteWorkExperienceAsync(int studentId, int workExperienceId, string ipAddress);
        Task AddEducationAsync(int studentId, EducationDto request, string ipAddress);
        Task<bool> UpdateEducationAsync(int studentId, int educationId, EducationDto request, string ipAddress);
        Task<bool> DeleteEducationAsync(int studentId, int educationId, string ipAddress);
        Task UpdateSkillsAsync(int studentId, List<string> skills, string ipAddress);
    }
}
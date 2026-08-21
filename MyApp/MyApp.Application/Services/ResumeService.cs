using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Shared.DTOs;

namespace MyApp.Application.Services
{
    public class ResumeService : IResumeService
    {
        private readonly IResumeRepository _resumeRepository;
        private readonly IActivityLogRepository _activityLogRepository;

        public ResumeService(
            IResumeRepository resumeRepository,
            IActivityLogRepository activityLogRepository)
        {
            _resumeRepository = resumeRepository;
            _activityLogRepository = activityLogRepository;
        }

        public async Task<List<ResumeDto>> GetResumesAsync(int studentId)
        {
            var resumes = await _resumeRepository.GetByStudentIdAsync(studentId);
            return resumes.Select(r => new ResumeDto
            {
                Id = r.Id,
                FileName = r.FileName,
                UploadedAt = r.UploadedAt,
                IsActive = r.IsActive
            }).ToList();
        }

        public async Task<ResumeDto?> GetActiveResumeAsync(int studentId)
        {
            var resume = await _resumeRepository.GetActiveByStudentIdAsync(studentId);
            if (resume == null) return null;

            return new ResumeDto
            {
                Id = resume.Id,
                FileName = resume.FileName,
                UploadedAt = resume.UploadedAt,
                IsActive = resume.IsActive
            };
        }

        public async Task<ResumeDto> UploadResumeAsync(int studentId, string fileName, string filePath, string ipAddress)
        {
            // Deactivate all previous resumes
            await _resumeRepository.DeactivateAllAsync(studentId);

            // Save new resume
            var resume = new Resume
            {
                StudentId = studentId,
                FileName = fileName,
                FilePath = filePath,
                UploadedAt = DateTime.UtcNow,
                IsActive = true
            };

            await _resumeRepository.CreateAsync(resume);
            await _activityLogRepository.LogStudentAsync(studentId, "UPLOAD_RESUME", $"Uploaded resume: {fileName}", ipAddress);

            return new ResumeDto
            {
                Id = resume.Id,
                FileName = resume.FileName,
                UploadedAt = resume.UploadedAt,
                IsActive = resume.IsActive
            };
        }

        public async Task<ResumeDto?> GetResumeByIdAsync(int resumeId)
        {
            var resume = await _resumeRepository.GetByIdAsync(resumeId);
            if (resume == null) return null;

            return new ResumeDto
            {
                Id = resume.Id,
                StudentId = resume.StudentId,
                FileName = resume.FileName,
                FilePath = resume.FilePath,
                UploadedAt = resume.UploadedAt,
                IsActive = resume.IsActive
            };
        }
    }
}
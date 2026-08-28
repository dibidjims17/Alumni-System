using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Shared.DTOs;

namespace MyApp.Application.Services
{
    public class JobService : IJobService
    {
        private readonly IJobRepository _jobRepository;
        private readonly IResumeRepository _resumeRepository;
        private readonly IActivityLogRepository _activityLogRepository;
        private readonly INotificationService _notificationService;
        private const int PageSize = 10;

        public JobService(
            IJobRepository jobRepository,
            IResumeRepository resumeRepository,
            IActivityLogRepository activityLogRepository,
            INotificationService notificationService)
        {
            _jobRepository = jobRepository;
            _resumeRepository = resumeRepository;
            _activityLogRepository = activityLogRepository;
            _notificationService = notificationService;
        }

        public async Task<(List<JobDto> Items, int TotalCount)> GetJobsAsync(int page, int studentId)
        {
            var jobs = await _jobRepository.GetActiveAsync(page, PageSize);
            var total = await _jobRepository.GetTotalCountAsync();

            var items = jobs.Select(j => new JobDto
            {
                Id = j.Id,
                JobTitle = j.JobTitle,
                Company = j.Company,
                Location = j.Location,
                Industry = j.Industry,
                EmploymentType = j.EmploymentType,
                SalaryMin = j.SalaryMin,
                SalaryMax = j.SalaryMax,
                Description = j.Description,
                PostedAt = j.PostedAt,
                Deadline = j.Deadline,
                IsActive = j.IsActive,
                ApplicantCount = j.Applications.Count,
                HasApplied = j.Applications.Any(a => a.StudentId == studentId)
            }).ToList();

            return (items, total);
        }

        public async Task<JobDto?> GetJobByIdAsync(int jobId, int studentId)
        {
            var job = await _jobRepository.GetByIdAsync(jobId);
            if (job == null) return null;

            return new JobDto
            {
                Id = job.Id,
                JobTitle = job.JobTitle,
                Company = job.Company,
                Location = job.Location,
                Industry = job.Industry,
                EmploymentType = job.EmploymentType,
                SalaryMin = job.SalaryMin,
                SalaryMax = job.SalaryMax,
                Description = job.Description,
                PostedAt = job.PostedAt,
                Deadline = job.Deadline,
                IsActive = job.IsActive,
                ApplicantCount = job.Applications.Count,
                HasApplied = job.Applications.Any(a => a.StudentId == studentId)
            };
        }

        public async Task<JobDto> CreateJobAsync(CreateJobRequest request, int adminId)
        {
            var job = new Job
            {
                JobTitle = request.JobTitle,
                Company = request.Company,
                Location = request.Location,
                Industry = request.Industry,
                EmploymentType = request.EmploymentType,
                SalaryMin = request.SalaryMin,
                SalaryMax = request.SalaryMax,
                Description = request.Description,
                Deadline = request.Deadline,
                IsActive = request.IsActive,
                PostedByAdminId = adminId,
                PostedAt = DateTime.UtcNow
            };

            await _jobRepository.CreateAsync(job);
            await _activityLogRepository.LogAdminAsync(adminId, "CREATE_JOB", $"Posted job: {request.JobTitle}", "system");
            await _notificationService.NotifyJobPostedAsync(job.JobTitle, job.Id);

            return new JobDto
            {
                Id = job.Id,
                JobTitle = job.JobTitle,
                Company = job.Company,
                Location = job.Location,
                Industry = job.Industry,
                EmploymentType = job.EmploymentType,
                SalaryMin = job.SalaryMin,
                SalaryMax = job.SalaryMax,
                Description = job.Description,
                PostedAt = job.PostedAt,
                Deadline = job.Deadline,
                IsActive = job.IsActive
            };
        }

        public async Task<bool> UpdateJobAsync(int jobId, CreateJobRequest request)
        {
            var job = await _jobRepository.GetByIdAsync(jobId);
            if (job == null) return false;

            job.JobTitle = request.JobTitle;
            job.Company = request.Company;
            job.Location = request.Location;
            job.Industry = request.Industry;
            job.EmploymentType = request.EmploymentType;
            job.SalaryMin = request.SalaryMin;
            job.SalaryMax = request.SalaryMax;
            job.Description = request.Description;
            job.Deadline = request.Deadline;
            job.IsActive = request.IsActive;

            await _jobRepository.UpdateAsync(job);
            return true;
        }

        public async Task<bool> DeleteJobAsync(int jobId)
        {
            var job = await _jobRepository.GetByIdAsync(jobId);
            if (job == null) return false;

            await _jobRepository.DeleteAsync(job);
            return true;
        }

        public async Task<bool> SoftDeleteJobAsync(int id)
        {
            var job = await _jobRepository.GetByIdAsync(id);
            if (job == null) return false;

            job.IsDeleted = true;
            await _jobRepository.UpdateAsync(job);
            return true;
        }

        public async Task<bool> RestoreJobAsync(int id)
        {
            var job = await _jobRepository.GetByIdIncludingDeletedAsync(id);
            if (job == null || !job.IsDeleted) return false;

            job.IsDeleted = false;
            await _jobRepository.UpdateAsync(job);
            return true;
        }

        public async Task<bool> PermanentlyDeleteJobAsync(int id)
        {
            var job = await _jobRepository.GetByIdIncludingDeletedAsync(id);
            if (job == null) return false;

            await _jobRepository.DeleteAsync(job);
            return true;
        }

        public async Task<List<JobDto>> GetDeletedJobsAsync()
        {
            var jobs = await _jobRepository.GetDeletedAsync();
            return jobs.Select(j => new JobDto
            {
                Id = j.Id,
                JobTitle = j.JobTitle,
                Company = j.Company,
                Location = j.Location,
                Industry = j.Industry,
                EmploymentType = j.EmploymentType,
                SalaryMin = j.SalaryMin,
                SalaryMax = j.SalaryMax,
                Description = j.Description,
                PostedAt = j.PostedAt,
                Deadline = j.Deadline,
                IsActive = j.IsActive
            }).ToList();
        }

        public async Task<(bool Success, string Message)> ApplyToJobAsync(int jobId, int studentId, ApplyJobRequest request, string ipAddress)
        {
            var job = await _jobRepository.GetByIdAsync(jobId);
            if (job == null || !job.IsActive)
                return (false, "Job not found or no longer active.");

            var existing = await _jobRepository.GetApplicationAsync(jobId, studentId);
            if (existing != null)
                return (false, "You already applied to this job.");

            int? resumeId = null;
            if (request.AttachResume)
            {
                var activeResume = await _resumeRepository.GetActiveByStudentIdAsync(studentId);
                if (activeResume != null)
                    resumeId = activeResume.Id;
            }

            var application = new JobApplication
            {
                JobId = jobId,
                StudentId = studentId,
                ResumeId = resumeId,
                AttachResume = request.AttachResume && resumeId != null,
                AppliedAt = DateTime.UtcNow,
                Status = "Pending"
            };

            await _jobRepository.CreateApplicationAsync(application);
            await _activityLogRepository.LogStudentAsync(studentId, "APPLY_JOB", $"Applied to job: {job.JobTitle}", ipAddress);

            return (true, "Application submitted successfully.");
        }

        public async Task<List<JobApplicationDto>> GetMyApplicationsAsync(int studentId)
        {
            var applications = await _jobRepository.GetApplicationsByStudentIdAsync(studentId);

            return applications.Select(a => new JobApplicationDto
            {
                Id = a.Id,
                JobId = a.JobId,
                JobTitle = a.Job.JobTitle,
                Company = a.Job.Company,
                AppliedAt = a.AppliedAt,
                Status = a.Status,
                AttachResume = a.AttachResume
            }).ToList();
        }

        public async Task<List<ApplicantDto>?> GetApplicantsAsync(int jobId)
        {
            var job = await _jobRepository.GetByIdAsync(jobId);
            if (job == null) return null;

            var applications = await _jobRepository.GetApplicationsByJobIdAsync(jobId);

            return applications.Select(a => new ApplicantDto
            {
                ApplicationId = a.Id,
                FullName = a.Student.FullName,
                StudentNumber = a.Student.StudentNumber,
                Email = a.Student.Email,
                Program = a.Student.Program,
                AppliedAt = a.AppliedAt,
                Status = a.Status,
                AttachResume = a.AttachResume,
                ResumeFileName = a.Resume?.FileName,
                ResumeId = a.Resume?.Id,
                AdminNotes = a.AdminNotes
            }).ToList();
        }

        public async Task<bool> UpdateApplicationStatusAsync(int applicationId, UpdateApplicationStatusRequest request, int adminId)
        {
            var application = await _jobRepository.GetApplicationByIdAsync(applicationId);
            if (application == null) return false;

            application.Status = request.Status;
            application.AdminNotes = request.AdminNotes;
            application.UpdatedAt = DateTime.UtcNow;

            await _jobRepository.UpdateApplicationAsync(application);
            await _activityLogRepository.LogAdminAsync(adminId, "UPDATE_APPLICATION_STATUS",
                $"Updated application #{applicationId} to {request.Status}", "system");

            // Notify the student
            await _notificationService.NotifyApplicationStatusChangeAsync(
                application.StudentId,
                application.Student.Email,
                application.Job.JobTitle,
                request.Status,
                applicationId);

            return true;
        }

        public async Task<List<ApplicantDto>?> GetApplicantsForExportAsync(int jobId, List<string>? statuses)
        {
            var allApplicants = await GetApplicantsAsync(jobId);
            if (allApplicants == null) return null;

            if (statuses == null || statuses.Count == 0)
                return allApplicants;

            return allApplicants
                .Where(a => statuses.Any(s => string.Equals(s, a.Status, StringComparison.OrdinalIgnoreCase)))
                .ToList();
        }
    }
}
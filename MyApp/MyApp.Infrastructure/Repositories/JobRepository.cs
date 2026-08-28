using Microsoft.EntityFrameworkCore;
using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Infrastructure.Data;

namespace MyApp.Infrastructure.Repositories
{
    public class JobRepository : IJobRepository
    {
        private readonly AppDbContext _context;

        public JobRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<Job>> GetActiveAsync(int page, int pageSize)
        {
            return await _context.Jobs
                .Where(j => j.IsActive && !j.IsDeleted)
                .Include(j => j.Applications)
                .OrderByDescending(j => j.PostedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<int> GetTotalCountAsync()
        {
            return await _context.Jobs.CountAsync(j => j.IsActive);
        }

        public async Task<Job?> GetByIdAsync(int id)
        {
            return await _context.Jobs
                .Where(j => !j.IsDeleted)
                .Include(j => j.Applications)
                .Include(j => j.PostedByAdmin)
                .FirstOrDefaultAsync(j => j.Id == id);
        }

        public async Task<Job?> GetByIdIncludingDeletedAsync(int id)
        {
            return await _context.Jobs
                .Include(j => j.Applications)
                .Include(j => j.PostedByAdmin)
                .FirstOrDefaultAsync(j => j.Id == id);
        }

        public async Task<List<Job>> GetDeletedAsync()
        {
            return await _context.Jobs
                .Where(j => j.IsDeleted)
                .Include(j => j.Applications)
                .OrderByDescending(j => j.PostedAt)
                .ToListAsync();
        }

        public async Task CreateAsync(Job job)
        {
            await _context.Jobs.AddAsync(job);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(Job job)
        {
            _context.Jobs.Update(job);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Job job)
        {
            _context.Jobs.Remove(job);
            await _context.SaveChangesAsync();
        }

        public async Task<JobApplication?> GetApplicationAsync(int jobId, int studentId)
        {
            return await _context.JobApplications
                .FirstOrDefaultAsync(a => a.JobId == jobId && a.StudentId == studentId);
        }

        public async Task<JobApplication?> GetApplicationByIdAsync(int applicationId)
        {
            return await _context.JobApplications
                .Include(a => a.Student)
                .Include(a => a.Resume)
                .Include(a => a.Job)
                .FirstOrDefaultAsync(a => a.Id == applicationId);
        }

        public async Task<List<JobApplication>> GetApplicationsByJobIdAsync(int jobId)
        {
            return await _context.JobApplications
                .Where(a => a.JobId == jobId)
                .Include(a => a.Student)
                .Include(a => a.Resume)
                .OrderByDescending(a => a.AppliedAt)
                .ToListAsync();
        }

        public async Task<List<JobApplication>> GetApplicationsByStudentIdAsync(int studentId)
        {
            return await _context.JobApplications
                .Where(a => a.StudentId == studentId)
                .Include(a => a.Job)
                .OrderByDescending(a => a.AppliedAt)
                .ToListAsync();
        }

        public async Task CreateApplicationAsync(JobApplication application)
        {
            await _context.JobApplications.AddAsync(application);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateApplicationAsync(JobApplication application)
        {
            _context.JobApplications.Update(application);
            await _context.SaveChangesAsync();
        }

        public async Task<int> GetActiveCountAsync()
        {
            return await _context.Jobs.CountAsync(j => j.IsActive);
        }
    }
}
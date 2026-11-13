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

        public async Task<List<Job>> GetActiveAsync(int page, int pageSize, string? search = null, decimal? minSalary = null, decimal? maxSalary = null)
        {
            // Public board hides jobs past their deadline — same "closed"
            // rule as ApplyAdminStatusFilter. Jobs without a deadline stay
            // listed indefinitely.
            var now = DateTime.UtcNow;
            var query = _context.Jobs.Where(j => j.IsActive && j.IsPublished && !j.IsDeleted &&
                                                  (j.Deadline == null || j.Deadline >= now));

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(j => j.JobTitle.Contains(term) || j.Company.Contains(term));
            }

            query = ApplySalaryFilter(query, minSalary, maxSalary);

            return await query
                .Include(j => j.Applications)
                .OrderByDescending(j => j.PostedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<int> GetTotalCountAsync(string? search = null, decimal? minSalary = null, decimal? maxSalary = null)
        {
            // Must mirror GetActiveAsync's filters exactly or pagination
            // (total pages vs. items per page) drifts.
            var now = DateTime.UtcNow;
            var query = _context.Jobs.Where(j => j.IsActive && j.IsPublished &&
                                                  (j.Deadline == null || j.Deadline >= now));

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(j => j.JobTitle.Contains(term) || j.Company.Contains(term));
            }

            query = ApplySalaryFilter(query, minSalary, maxSalary);

            return await query.CountAsync();
        }

        public async Task<List<Job>> GetAdminListAsync(int page, int pageSize, string? search = null, decimal? minSalary = null, decimal? maxSalary = null, string? status = null)
        {
            var query = _context.Jobs.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(j => j.JobTitle.Contains(term) || j.Company.Contains(term));
            }

            query = ApplySalaryFilter(query, minSalary, maxSalary);
            query = ApplyAdminStatusFilter(query, status);

            return await query
                .Include(j => j.Applications)
                .OrderByDescending(j => j.PostedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<int> GetAdminTotalCountAsync(string? search = null, decimal? minSalary = null, decimal? maxSalary = null, string? status = null)
        {
            var query = _context.Jobs.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(j => j.JobTitle.Contains(term) || j.Company.Contains(term));
            }

            query = ApplySalaryFilter(query, minSalary, maxSalary);
            query = ApplyAdminStatusFilter(query, status);
            return await query.CountAsync();
        }

        private static IQueryable<Job> ApplyAdminStatusFilter(IQueryable<Job> query, string? status)
        {
            var now = DateTime.UtcNow;
            return status?.Trim().ToLowerInvariant() switch
            {
                "draft" => query.Where(j => !j.IsPublished),
                "active" => query.Where(j => j.IsPublished && j.IsActive &&
                                             (j.Deadline == null || j.Deadline >= now)),
                "closed" => query.Where(j => j.IsPublished &&
                                             (!j.IsActive || (j.Deadline != null && j.Deadline < now))),
                _ => query
            };
        }

        // Overlap semantics: a bound only excludes jobs whose KNOWN range
        // falls entirely outside it. Undisclosed salaries always pass.
        private static IQueryable<Job> ApplySalaryFilter(IQueryable<Job> query, decimal? minSalary, decimal? maxSalary)
        {
            if (minSalary.HasValue)
                query = query.Where(j => j.SalaryMax == null || j.SalaryMax >= minSalary.Value);

            if (maxSalary.HasValue)
                query = query.Where(j => j.SalaryMin == null || j.SalaryMin <= maxSalary.Value);

            return query;
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
                .IgnoreQueryFilters()
                .Include(j => j.Applications)
                .Include(j => j.PostedByAdmin)
                .FirstOrDefaultAsync(j => j.Id == id);
        }

        public async Task<List<Job>> GetDeletedAsync()
        {
            return await _context.Jobs
                .IgnoreQueryFilters()
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

        public async Task AddApplicationHistoryAsync(JobApplicationHistory history)
        {
            await _context.JobApplicationHistory.AddAsync(history);
            await _context.SaveChangesAsync();
        }

        public async Task<List<JobApplicationHistory>> GetHistoryByApplicationIdAsync(int applicationId)
        {
            return await _context.JobApplicationHistory
                .Where(h => h.JobApplicationId == applicationId)
                .Include(h => h.UpdatedByAdmin)
                .OrderByDescending(h => h.CreatedAt)
                .ToListAsync();
        }

        public async Task<int> GetActiveCountAsync()
        {
            // Same availability rule as the public board: deadline-passed
            // jobs are no longer "active".
            var now = DateTime.UtcNow;
            return await _context.Jobs.CountAsync(j => j.IsActive && j.IsPublished &&
                                                        (j.Deadline == null || j.Deadline >= now));
        }
    }
}

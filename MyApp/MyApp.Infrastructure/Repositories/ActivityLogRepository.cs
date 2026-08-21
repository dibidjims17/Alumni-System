using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace MyApp.Infrastructure.Repositories
{
    public class ActivityLogRepository : IActivityLogRepository
    {
        private readonly AppDbContext _context;

        public ActivityLogRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task LogStudentAsync(int studentId, string action, string details, string ipAddress)
        {
            var log = new ActivityLog
            {
                StudentId = studentId,
                AdminId = null,
                Action = action,
                Details = details,
                IpAddress = ipAddress,
                CreatedAt = DateTime.UtcNow
            };
            await _context.ActivityLogs.AddAsync(log);
            await _context.SaveChangesAsync();
        }

        public async Task LogAdminAsync(int adminId, string action, string details, string ipAddress)
        {
            var log = new ActivityLog
            {
                StudentId = null,
                AdminId = adminId,
                Action = action,
                Details = details,
                IpAddress = ipAddress,
                CreatedAt = DateTime.UtcNow
            };
            await _context.ActivityLogs.AddAsync(log);
            await _context.SaveChangesAsync();
        }

        public async Task<List<ActivityLog>> GetAllAsync(int page, int pageSize)
        {
            return await _context.ActivityLogs
                .Include(a => a.Student)
                .Include(a => a.Admin)
                .OrderByDescending(a => a.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<int> GetTotalCountAsync()
        {
            return await _context.ActivityLogs.CountAsync();
        }
    }
}
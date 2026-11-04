using Microsoft.EntityFrameworkCore;
using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Infrastructure.Data;

namespace MyApp.Infrastructure.Repositories
{
    public class NotificationRepository : INotificationRepository
    {
        private readonly AppDbContext _context;

        public NotificationRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<Notification>> GetByStudentIdAsync(int studentId)
        {
            return await _context.Notifications
                .Where(n => n.StudentId == studentId)
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();
        }

        public async Task<int> GetUnreadCountAsync(int studentId)
        {
            return await _context.Notifications
                .CountAsync(n => n.StudentId == studentId && !n.IsRead);
        }

        public async Task<Notification?> GetByIdAsync(int id)
        {
            return await _context.Notifications.FirstOrDefaultAsync(n => n.Id == id);
        }

        public async Task<Notification?> GetLatestByTypeAsync(int studentId, string type)
        {
            return await _context.Notifications
                .Where(n => n.StudentId == studentId && n.Type == type)
                .OrderByDescending(n => n.CreatedAt)
                .FirstOrDefaultAsync();
        }

        public async Task<List<Notification>> GetActiveCareerRemindersByStudentIdsAsync(
            IEnumerable<int> studentIds,
            DateTime recentSince)
        {
            var ids = studentIds.Distinct().ToList();
            if (ids.Count == 0)
                return new List<Notification>();

            return await _context.Notifications
                .AsNoTracking()
                .Where(n => ids.Contains(n.StudentId) &&
                    (n.Type == "CAREER_REMINDER" || n.Type == "CAREER_RESUBMIT_REMINDER") &&
                    (!n.IsRead || n.CreatedAt > recentSince))
                .OrderByDescending(n => n.CreatedAt)
                .ToListAsync();
        }

        public async Task CreateAsync(Notification notification)
        {
            await _context.Notifications.AddAsync(notification);
            await _context.SaveChangesAsync();
        }

        public async Task MarkAsReadAsync(Notification notification)
        {
            notification.IsRead = true;
            _context.Notifications.Update(notification);
            await _context.SaveChangesAsync();
        }

        public async Task MarkAllAsReadAsync(int studentId)
        {
            var notifications = await _context.Notifications
                .Where(n => n.StudentId == studentId && !n.IsRead)
                .ToListAsync();

            foreach (var n in notifications)
                n.IsRead = true;

            await _context.SaveChangesAsync();
        }
    }
}

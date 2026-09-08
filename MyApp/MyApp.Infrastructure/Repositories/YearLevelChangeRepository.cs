using Microsoft.EntityFrameworkCore;
using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Infrastructure.Data;

namespace MyApp.Infrastructure.Repositories
{
    public class YearLevelChangeRepository : IYearLevelChangeRepository
    {
        private readonly AppDbContext _context;

        public YearLevelChangeRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<YearLevelChangeRequest?> GetPendingByStudentAsync(int studentId)
        {
            return await _context.YearLevelChangeRequests
                .FirstOrDefaultAsync(r => r.StudentId == studentId && r.Status == "Pending");
        }

        public async Task<YearLevelChangeRequest?> GetByIdAsync(int id)
        {
            return await _context.YearLevelChangeRequests
                .Include(r => r.Student)
                .Include(r => r.ReviewedByAdmin)
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task<List<YearLevelChangeRequest>> GetByStatusAsync(string? status)
        {
            var query = _context.YearLevelChangeRequests
                .Include(r => r.Student)
                .Include(r => r.ReviewedByAdmin)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(r => r.Status == status);

            return await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
        }

        public async Task<List<YearLevelChangeRequest>> GetByStudentAsync(int studentId)
        {
            return await _context.YearLevelChangeRequests
                .Where(r => r.StudentId == studentId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

        public async Task CreateAsync(YearLevelChangeRequest request)
        {
            await _context.YearLevelChangeRequests.AddAsync(request);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(YearLevelChangeRequest request)
        {
            _context.YearLevelChangeRequests.Update(request);
            await _context.SaveChangesAsync();
        }
    }
}

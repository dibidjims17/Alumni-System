using Microsoft.EntityFrameworkCore;
using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Infrastructure.Data;

namespace MyApp.Infrastructure.Repositories
{
    public class CareerRepository : ICareerRepository
    {
        private readonly AppDbContext _context;

        public CareerRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<CareerRecord?> GetLatestByStudentAsync(int studentId)
        {
            return await _context.CareerRecords
                .Include(r => r.ReviewedByAdmin)
                .Where(r => r.StudentId == studentId)
                .OrderByDescending(r => r.Id)
                .FirstOrDefaultAsync();
        }

        public async Task<CareerRecord?> GetByIdAsync(int id)
        {
            return await _context.CareerRecords
                .Include(r => r.Student)
                .Include(r => r.ReviewedByAdmin)
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task<List<CareerRecord>> GetAllAsync(string? status)
        {
            var query = _context.CareerRecords
                .Include(r => r.Student)
                .Include(r => r.ReviewedByAdmin)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(r => r.Status == status);

            return await query.OrderByDescending(r => r.Id).ToListAsync();
        }

        public async Task<List<CareerRecord>> GetHistoryAsync()
        {
            return await _context.CareerRecords
                .Select(r => new CareerRecord
                {
                    Id = r.Id,
                    StudentId = r.StudentId,
                    EmploymentStatus = r.EmploymentStatus,
                    Status = r.Status
                })
                .ToListAsync();
        }

        public async Task CreateAsync(CareerRecord record)
        {
            await _context.CareerRecords.AddAsync(record);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(CareerRecord record)
        {
            _context.CareerRecords.Update(record);
            await _context.SaveChangesAsync();
        }
    }
}

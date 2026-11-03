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
                .Include(r => r.Student)
                .Include(r => r.ReviewedByAdmin)
                .Where(r => r.StudentId == studentId)
                .OrderByDescending(r => r.Id)
                .FirstOrDefaultAsync();
        }

        public async Task<IReadOnlyDictionary<int, CareerRecord>> GetLatestByStudentIdsAsync(
            IEnumerable<int> studentIds)
        {
            var ids = studentIds.Distinct().ToList();
            if (ids.Count == 0)
                return new Dictionary<int, CareerRecord>();

            // Fetch once and group in memory. This avoids one query per alumni
            // card while remaining compatible with the current MySQL provider.
            var records = await _context.CareerRecords
                .AsNoTracking()
                .Where(r => ids.Contains(r.StudentId))
                .OrderByDescending(r => r.Id)
                .ToListAsync();

            return records
                .GroupBy(r => r.StudentId)
                .ToDictionary(group => group.Key, group => group.First());
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
                     Status = r.Status,
                     CourseAlignment = r.CourseAlignment
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

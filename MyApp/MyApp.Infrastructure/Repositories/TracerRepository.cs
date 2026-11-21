using Microsoft.EntityFrameworkCore;
using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Infrastructure.Data;

namespace MyApp.Infrastructure.Repositories
{
    public class TracerRepository : ITracerRepository
    {
        private readonly AppDbContext _context;

        public TracerRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<TracerResponse?> GetByStudentAsync(int studentId)
        {
            return await _context.TracerResponses
                .Include(r => r.Student)
                .FirstOrDefaultAsync(r => r.StudentId == studentId);
        }

        public async Task<bool> IsSubmittedAsync(int studentId)
        {
            return await _context.TracerResponses
                .AnyAsync(r => r.StudentId == studentId && r.Status == "Submitted");
        }

        public async Task CreateAsync(TracerResponse response)
        {
            await _context.TracerResponses.AddAsync(response);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(TracerResponse response)
        {
            _context.TracerResponses.Update(response);
            await _context.SaveChangesAsync();
        }

        // ---- Admin cleanup ----

        public async Task<TracerResponse?> GetByIdAsync(int id)
        {
            return await _context.TracerResponses
                .Include(r => r.Student)
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task DeleteAsync(TracerResponse response)
        {
            _context.TracerResponses.Remove(response);
            await _context.SaveChangesAsync();
        }

        // ---- Admin reporting (P3) ----

        public async Task<(List<TracerResponse> Items, int Total)> GetAdminResponsesAsync(
            int page, int pageSize, string? search, string? status,
            string? employment, string? relatedness, string? program)
        {
            IQueryable<TracerResponse> query = _context.TracerResponses
                .Include(r => r.Student);

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(r => r.Status == status.Trim());
            if (!string.IsNullOrWhiteSpace(employment))
                query = query.Where(r => r.EmploymentStatus == employment.Trim());
            if (!string.IsNullOrWhiteSpace(relatedness))
                query = query.Where(r => r.CourseRelatedness == relatedness.Trim());
            if (!string.IsNullOrWhiteSpace(program))
                query = query.Where(r => r.Student.Program == program.Trim());

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(r =>
                    r.Student.FullName.Contains(term) ||
                    r.Student.StudentNumber.Contains(term) ||
                    r.Student.Email.Contains(term));
            }

            var total = await query.CountAsync();

            var items = await query
                .OrderByDescending(r => r.UpdatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (items, total);
        }

        public async Task<List<TracerResponse>> GetAllWithStudentsAsync()
        {
            return await _context.TracerResponses
                .Include(r => r.Student)
                .ToListAsync();
        }

        public async Task<int> GetGraduateCountAsync()
        {
            return await _context.Students.CountAsync(
                s => s.IsActive && s.SchoolYear == "Graduate");
        }

        public async Task<List<string>> GetGraduateProgramsAsync()
        {
            return await _context.Students
                .Where(s => s.IsActive && s.SchoolYear == "Graduate")
                .Select(s => s.Program)
                .Distinct()
                .OrderBy(p => p)
                .ToListAsync();
        }
    }
}

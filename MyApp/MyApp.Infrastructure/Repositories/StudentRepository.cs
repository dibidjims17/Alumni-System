using Microsoft.EntityFrameworkCore;
using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Infrastructure.Data;

namespace MyApp.Infrastructure.Repositories
{
    public class StudentRepository : IStudentRepository
    {
        private readonly AppDbContext _context;

        public StudentRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Student?> GetByStudentNumberAsync(string studentNumber)
        {
            return await _context.Students
                .FirstOrDefaultAsync(s => s.StudentNumber == studentNumber);
        }

        public async Task<Student?> GetByEmailAsync(string email)
        {
            return await _context.Students.FirstOrDefaultAsync(s => s.Email == email);
        }

        public async Task<Student?> GetByIdAsync(int id)
        {
            return await _context.Students
                .FirstOrDefaultAsync(s => s.Id == id);
        }

        public async Task<List<Student>> GetAllAsync()
        {
            return await _context.Students
                .OrderBy(s => s.FullName)
                .ToListAsync();
        }

        public async Task UpdateAsync(Student student)
        {
            _context.Students.Update(student);
            await _context.SaveChangesAsync();
        }

        public async Task CreateAsync(Student student)
        {
            await _context.Students.AddAsync(student);
            await _context.SaveChangesAsync();
        }

        public async Task<int> CountAllAsync()
        {
            return await _context.Students.CountAsync();
        }

        public async Task<int> CountActiveAsync()
        {
            return await _context.Students.CountAsync(s => s.IsActive);
        }

        public async Task<int> CountGraduateAsync()
        {
            return await _context.Students.CountAsync(s => s.SchoolYear == "Graduate");
        }

        private IQueryable<Student> DirectoryBaseQuery()
        {
            return _context.Students
                .Where(s => s.IsActive && s.SchoolYear == "Graduate" && s.ShowInDirectory);
        }

        public async Task<(List<Student> Items, int Total)> SearchDirectoryAsync(
            string? search, string? program, string? schoolYear, int page, int pageSize)
        {
            var query = DirectoryBaseQuery();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(s => s.FullName.Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(program))
            {
                var programTerm = program.Trim();
                query = query.Where(s => s.Program == programTerm);
            }

            if (!string.IsNullOrWhiteSpace(schoolYear))
            {
                var yearTerm = schoolYear.Trim();
                query = query.Where(s => s.SchoolYear == yearTerm);
            }

            var total = await query.CountAsync();
            var items = await query
                .OrderBy(s => s.FullName)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (items, total);
        }

        public async Task<(List<string> Programs, List<string> SchoolYears)> GetDirectoryFilterValuesAsync()
        {
            var baseQuery = DirectoryBaseQuery();

            var programs = await baseQuery
                .Select(s => s.Program)
                .Distinct()
                .OrderBy(p => p)
                .ToListAsync();

            var schoolYears = await baseQuery
                .Select(s => s.SchoolYear)
                .Distinct()
                .OrderBy(y => y)
                .ToListAsync();

            return (programs, schoolYears);
        }
    }
}
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
    }
}
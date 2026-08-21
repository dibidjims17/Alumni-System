using Microsoft.EntityFrameworkCore;
using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Infrastructure.Data;

namespace MyApp.Infrastructure.Repositories
{
    public class EducationRepository : IEducationRepository
    {
        private readonly AppDbContext _context;

        public EducationRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<Education>> GetByStudentIdAsync(int studentId)
        {
            return await _context.Educations
                .Where(e => e.StudentId == studentId)
                .OrderByDescending(e => e.StartYear)
                .ToListAsync();
        }

        public async Task<Education?> GetByIdAsync(int id)
        {
            return await _context.Educations.FirstOrDefaultAsync(e => e.Id == id);
        }

        public async Task CreateAsync(Education education)
        {
            await _context.Educations.AddAsync(education);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(Education education)
        {
            _context.Educations.Update(education);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Education education)
        {
            _context.Educations.Remove(education);
            await _context.SaveChangesAsync();
        }
    }
}
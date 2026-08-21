using Microsoft.EntityFrameworkCore;
using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Infrastructure.Data;

namespace MyApp.Infrastructure.Repositories
{
    public class WorkExperienceRepository : IWorkExperienceRepository
    {
        private readonly AppDbContext _context;

        public WorkExperienceRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<WorkExperience>> GetByStudentIdAsync(int studentId)
        {
            return await _context.WorkExperiences
                .Where(w => w.StudentId == studentId)
                .OrderByDescending(w => w.StartDate)
                .ToListAsync();
        }

        public async Task<WorkExperience?> GetByIdAsync(int id)
        {
            return await _context.WorkExperiences.FirstOrDefaultAsync(w => w.Id == id);
        }

        public async Task CreateAsync(WorkExperience workExperience)
        {
            await _context.WorkExperiences.AddAsync(workExperience);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(WorkExperience workExperience)
        {
            _context.WorkExperiences.Update(workExperience);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(WorkExperience workExperience)
        {
            _context.WorkExperiences.Remove(workExperience);
            await _context.SaveChangesAsync();
        }
    }
}
using Microsoft.EntityFrameworkCore;
using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Infrastructure.Data;

namespace MyApp.Infrastructure.Repositories
{
    public class SkillRepository : ISkillRepository
    {
        private readonly AppDbContext _context;

        public SkillRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<Skill>> GetByStudentIdAsync(int studentId)
        {
            return await _context.Skills
                .Where(s => s.StudentId == studentId)
                .ToListAsync();
        }

        public async Task CreateAsync(Skill skill)
        {
            await _context.Skills.AddAsync(skill);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Skill skill)
        {
            _context.Skills.Remove(skill);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAllByStudentIdAsync(int studentId)
        {
            var skills = await _context.Skills
                .Where(s => s.StudentId == studentId)
                .ToListAsync();
            _context.Skills.RemoveRange(skills);
            await _context.SaveChangesAsync();
        }
    }
}
using Microsoft.EntityFrameworkCore;
using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Infrastructure.Data;

namespace MyApp.Infrastructure.Repositories
{
    public class ResumeRepository : IResumeRepository
    {
        private readonly AppDbContext _context;

        public ResumeRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<Resume>> GetByStudentIdAsync(int studentId)
        {
            return await _context.Resumes
                .Where(r => r.StudentId == studentId)
                .OrderByDescending(r => r.UploadedAt)
                .ToListAsync();
        }

        public async Task<Resume?> GetActiveByStudentIdAsync(int studentId)
        {
            return await _context.Resumes
                .FirstOrDefaultAsync(r => r.StudentId == studentId && r.IsActive);
        }

        public async Task<Resume?> GetByIdAsync(int id)
        {
            return await _context.Resumes.FindAsync(id);
        }

        public async Task CreateAsync(Resume resume)
        {
            await _context.Resumes.AddAsync(resume);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(Resume resume)
        {
            _context.Resumes.Update(resume);
            await _context.SaveChangesAsync();
        }

        public async Task DeactivateAllAsync(int studentId)
        {
            var resumes = await _context.Resumes
                .Where(r => r.StudentId == studentId)
                .ToListAsync();

            foreach (var resume in resumes)
                resume.IsActive = false;

            await _context.SaveChangesAsync();
        }
    }
}
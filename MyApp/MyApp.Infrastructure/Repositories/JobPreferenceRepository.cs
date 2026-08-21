using Microsoft.EntityFrameworkCore;
using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Infrastructure.Data;

namespace MyApp.Infrastructure.Repositories
{
    public class JobPreferenceRepository : IJobPreferenceRepository
    {
        private readonly AppDbContext _context;

        public JobPreferenceRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<JobPreference?> GetByStudentIdAsync(int studentId)
        {
            return await _context.JobPreferences
                .FirstOrDefaultAsync(p => p.StudentId == studentId);
        }

        public async Task CreateAsync(JobPreference preference)
        {
            await _context.JobPreferences.AddAsync(preference);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(JobPreference preference)
        {
            _context.JobPreferences.Update(preference);
            await _context.SaveChangesAsync();
        }
    }
}
using Microsoft.EntityFrameworkCore;
using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Infrastructure.Data;

namespace MyApp.Infrastructure.Repositories
{
    public class AlumniProfileRepository : IAlumniProfileRepository
    {
        private readonly AppDbContext _context;

        public AlumniProfileRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<AlumniProfile?> GetByStudentIdAsync(int studentId)
        {
            return await _context.AlumniProfiles
                .FirstOrDefaultAsync(p => p.StudentId == studentId);
        }

        public async Task CreateAsync(AlumniProfile profile)
        {
            await _context.AlumniProfiles.AddAsync(profile);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(AlumniProfile profile)
        {
            _context.AlumniProfiles.Update(profile);
            await _context.SaveChangesAsync();
        }
    }
}
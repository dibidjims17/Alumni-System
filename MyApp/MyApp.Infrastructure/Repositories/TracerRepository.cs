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
    }
}

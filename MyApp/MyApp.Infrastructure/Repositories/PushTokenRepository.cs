using Microsoft.EntityFrameworkCore;
using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Infrastructure.Data;

namespace MyApp.Infrastructure.Repositories
{
    public class PushTokenRepository : IPushTokenRepository
    {
        private readonly AppDbContext _context;

        public PushTokenRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<string>> GetTokensByStudentIdAsync(int studentId)
        {
            return await _context.PushTokens
                .Where(p => p.StudentId == studentId)
                .Select(p => p.Token)
                .ToListAsync();
        }

        public async Task<List<string>> GetTokensForActiveStudentsAsync(bool graduatesOnly)
        {
            var query = _context.PushTokens.AsQueryable();
            if (graduatesOnly)
            {
                query = query.Where(p => p.Student.SchoolYear == "Graduate");
            }
            return await query
                .Where(p => p.Student.IsActive)
                .Select(p => p.Token)
                .Distinct()
                .ToListAsync();
        }

        public async Task UpsertAsync(int studentId, string token, string platform)
        {
            var existing = await _context.PushTokens.FirstOrDefaultAsync(p => p.Token == token);
            if (existing != null)
            {
                existing.StudentId = studentId;
                existing.Platform = platform;
                existing.UpdatedAt = DateTime.UtcNow;
                _context.PushTokens.Update(existing);
            }
            else
            {
                await _context.PushTokens.AddAsync(new PushToken
                {
                    StudentId = studentId,
                    Token = token,
                    Platform = platform,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();
        }

        public async Task<bool> DeleteByTokenAsync(string token)
        {
            var rows = await _context.PushTokens
                .Where(p => p.Token == token)
                .ToListAsync();

            if (rows.Count == 0) return false;

            _context.PushTokens.RemoveRange(rows);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}

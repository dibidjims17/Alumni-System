using Microsoft.EntityFrameworkCore;
using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Infrastructure.Data;

namespace MyApp.Infrastructure.Repositories
{
    public class NewsSuggestionRepository : INewsSuggestionRepository
    {
        private readonly AppDbContext _context;

        public NewsSuggestionRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task CreateAsync(NewsSuggestion suggestion)
        {
            await _context.NewsSuggestions.AddAsync(suggestion);
            await _context.SaveChangesAsync();
        }

        public async Task<NewsSuggestion?> GetByIdAsync(int id)
        {
            return await _context.NewsSuggestions
                .Include(s => s.Student)
                .Include(s => s.ReviewedByAdmin)
                .FirstOrDefaultAsync(s => s.Id == id);
        }

        public async Task UpdateAsync(NewsSuggestion suggestion)
        {
            _context.NewsSuggestions.Update(suggestion);
            await _context.SaveChangesAsync();
        }

        public async Task<(List<NewsSuggestion> Items, int Total)> GetByStudentAsync(
            int studentId, int page, int pageSize)
        {
            var query = _context.NewsSuggestions
                .Where(s => s.StudentId == studentId);

            var total = await query.CountAsync();

            var items = await query
                .OrderByDescending(s => s.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (items, total);
        }

        public async Task<(List<NewsSuggestion> Items, int Total)> GetAllAsync(
            int page, int pageSize, string? status, string? search)
        {
            IQueryable<NewsSuggestion> query = _context.NewsSuggestions
                .Include(s => s.Student)
                .Include(s => s.ReviewedByAdmin);

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(s => s.Status == status.Trim());

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(s =>
                    s.Title.Contains(term) ||
                    s.Content.Contains(term) ||
                    s.Student.FullName.Contains(term) ||
                    s.Student.StudentNumber.Contains(term));
            }

            var total = await query.CountAsync();

            // Pending rows float to the top of the review queue, newest first.
            var items = await query
                .OrderBy(s => s.Status == "Pending" ? 0 : 1)
                .ThenByDescending(s => s.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (items, total);
        }

        public async Task<int> CountPendingAsync()
        {
            return await _context.NewsSuggestions
                .CountAsync(s => s.Status == "Pending");
        }
    }
}

using MyApp.Domain.Entities;

namespace MyApp.Application.Interfaces
{
    public interface INewsSuggestionRepository
    {
        Task CreateAsync(NewsSuggestion suggestion);
        Task<NewsSuggestion?> GetByIdAsync(int id);
        Task UpdateAsync(NewsSuggestion suggestion);

        // The submitter's own list, newest first.
        Task<(List<NewsSuggestion> Items, int Total)> GetByStudentAsync(
            int studentId, int page, int pageSize);

        // Admin queue: pending first, then newest. Optional status filter
        // ("" = all) and free-text search over title/content/submitter.
        Task<(List<NewsSuggestion> Items, int Total)> GetAllAsync(
            int page, int pageSize, string? status, string? search);

        // Fast pending count — used by the admin nav badge.
        Task<int> CountPendingAsync();
    }
}

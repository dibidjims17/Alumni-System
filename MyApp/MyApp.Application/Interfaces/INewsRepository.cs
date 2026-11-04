using MyApp.Domain.Entities;

namespace MyApp.Application.Interfaces
{
    public interface INewsRepository
    {
        Task<List<News>> GetPublishedAsync(int page, int pageSize, string? search = null);
        Task<News?> GetByIdAsync(int id);
        Task<int> GetTotalCountAsync(string? search = null);

        // Admin list: everything that isn't in the trash, drafts included.
        Task<List<News>> GetAdminListAsync(int page, int pageSize, string? search = null, string? status = null);
        Task<int> GetAdminTotalCountAsync(string? search = null, string? status = null);

        // Scheduled posts whose PublishAt has elapsed — promoted (and
        // announced) by NewsPublishHostedService.
        Task<List<News>> GetDueScheduledAsync();
        Task CreateAsync(News news);
        Task UpdateAsync(News news);
        Task DeleteAsync(News news);

        // Hearts
        Task<NewsHeart?> GetHeartAsync(int newsId, int studentId);
        Task AddHeartAsync(NewsHeart heart);
        Task RemoveHeartAsync(NewsHeart heart);

        // Comments
        Task<NewsComment?> GetCommentByIdAsync(int commentId);
        Task AddCommentAsync(NewsComment comment);
        Task UpdateCommentAsync(NewsComment comment);
        Task<NewsCommentLike?> GetCommentLikeAsync(int commentId, int studentId);
        Task AddCommentLikeAsync(NewsCommentLike like);
        Task RemoveCommentLikeAsync(NewsCommentLike like);

        // Delete
        Task<News?> GetByIdIncludingDeletedAsync(int id);
        Task<List<News>> GetDeletedAsync();
    }
}

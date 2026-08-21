using MyApp.Domain.Entities;

namespace MyApp.Application.Interfaces
{
    public interface INewsRepository
    {
        Task<List<News>> GetPublishedAsync(int page, int pageSize);
        Task<News?> GetByIdAsync(int id);
        Task<int> GetTotalCountAsync();
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
    }
}
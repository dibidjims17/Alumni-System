using MyApp.Shared.DTOs;

namespace MyApp.Application.Interfaces
{
    public interface INewsService
    {
        Task<(List<NewsDto> Items, int TotalCount)> GetNewsAsync(int page, int studentId, string? search = null);
        Task<NewsDetailDto?> GetNewsByIdAsync(int newsId, int studentId);
        Task<NewsDto> CreateNewsAsync(CreateNewsRequest request, int adminId, string? imagePath);
        Task<bool> UpdateNewsAsync(int newsId, CreateNewsRequest request, string? imagePath);
        Task<bool> DeleteNewsAsync(int newsId);
        Task<bool> ToggleHeartAsync(int newsId, int studentId);

        // Comments
        Task<NewsCommentDto> AddCommentAsync(int newsId, int studentId, AddCommentRequest request, string ipAddress);
        Task<bool> DeleteCommentAsync(int commentId);
        Task<bool> ToggleCommentLikeAsync(int commentId, int studentId);
        Task<bool> EditCommentAsync(int commentId, int studentId, EditCommentRequest request);
        Task<bool> DeleteCommentAsync(int commentId, int studentId);
        Task<bool> DeleteCommentAsAdminAsync(int commentId, int adminId);

        // Deleted
        Task<bool> SoftDeleteNewsAsync(int id);
        Task<bool> RestoreNewsAsync(int id);
        Task<bool> PermanentlyDeleteNewsAsync(int id);
        Task<List<NewsDto>> GetDeletedNewsAsync();
    }
}
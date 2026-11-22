using MyApp.Shared.DTOs;

namespace MyApp.Application.Interfaces
{
    public interface INewsSuggestionService
    {
        // Any signed-in user submits; returns the created row as its
        // "Pending" my-list DTO (or a validation message on failure).
        Task<(bool Success, string Message, NewsSuggestionMyDto? Suggestion)> SubmitAsync(
            int studentId, string title, string content, string? imagePath, string ipAddress);

        Task<(List<NewsSuggestionMyDto> Items, int Total)> GetMyAsync(
            int studentId, int page);

        Task<(List<NewsSuggestionRowDto> Items, int Total)> GetAllAsync(
            int page, int pageSize, string? status, string? search);

        // Approve (publishes to the Community feed as News) or Reject
        // (note required). Only Pending rows can be reviewed.
        Task<(bool Success, string Message)> ReviewAsync(
            int id, string status, string? reviewNote, int adminId, string ipAddress);
    }
}

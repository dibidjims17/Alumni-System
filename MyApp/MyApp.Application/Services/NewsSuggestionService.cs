using MyApp.Application.Interfaces;
using MyApp.Shared.DTOs;

namespace MyApp.Application.Services
{
    public class NewsSuggestionService : INewsSuggestionService
    {
        private readonly INewsSuggestionRepository _suggestions;
        private readonly INewsService _newsService;
        private readonly IActivityLogRepository _activityLogs;
        private readonly INotificationService _notifications;

        public NewsSuggestionService(
            INewsSuggestionRepository suggestions,
            INewsService newsService,
            IActivityLogRepository activityLogs,
            INotificationService notifications)
        {
            _suggestions = suggestions;
            _newsService = newsService;
            _activityLogs = activityLogs;
            _notifications = notifications;
        }

        public async Task<(bool Success, string Message, NewsSuggestionMyDto? Suggestion)> SubmitAsync(
            int studentId, string title, string content, string? imagePath, string ipAddress)
        {
            var cleanTitle = (title ?? string.Empty).Trim();
            var cleanContent = (content ?? string.Empty).Trim();

            if (cleanTitle.Length == 0)
                return (false, "Title is required.", null);
            if (cleanTitle.Length > 120)
                return (false, "Title must be 120 characters or fewer.", null);
            if (cleanContent.Length == 0)
                return (false, "Post content is required.", null);
            if (cleanContent.Length > 3000)
                return (false, "Post must be 3000 characters or fewer.", null);

            var suggestion = new Domain.Entities.NewsSuggestion
            {
                StudentId = studentId,
                Title = cleanTitle,
                Content = cleanContent,
                ImagePath = imagePath,
                Status = "Pending"
            };

            await _suggestions.CreateAsync(suggestion);
            await _activityLogs.LogStudentAsync(
                studentId, "SUGGEST_POST", $"Suggested post: {cleanTitle}", ipAddress);

            return (true, "Suggestion submitted for review.", new NewsSuggestionMyDto
            {
                Id = suggestion.Id,
                Title = suggestion.Title,
                Content = suggestion.Content,
                ImagePath = suggestion.ImagePath,
                Status = suggestion.Status,
                CreatedAt = suggestion.CreatedAt
            });
        }

        public async Task<(List<NewsSuggestionMyDto> Items, int Total)> GetMyAsync(int studentId, int page)
        {
            var (items, total) = await _suggestions.GetByStudentAsync(studentId, page, pageSize: 20);
            return (items.Select(MapMy).ToList(), total);
        }

        public async Task<(List<NewsSuggestionRowDto> Items, int Total)> GetAllAsync(
            int page, int pageSize, string? status, string? search)
        {
            var (items, total) = await _suggestions.GetAllAsync(page, pageSize, status, search);
            return (items.Select(MapRow).ToList(), total);
        }

        public async Task<(bool Success, string Message)> ReviewAsync(
            int id, string status, string? reviewNote, int adminId, string ipAddress)
        {
            var cleanStatus = (status ?? string.Empty).Trim();
            if (cleanStatus != "Approved" && cleanStatus != "Rejected")
                return (false, "Status must be Approved or Rejected.");

            var note = string.IsNullOrWhiteSpace(reviewNote) ? null : reviewNote.Trim();

            // Mirror the career-proof rule: a rejection must explain why so
            // the submitter knows what to fix.
            if (cleanStatus == "Rejected" && note == null)
                return (false, "A note is required when rejecting.");

            var suggestion = await _suggestions.GetByIdAsync(id);
            if (suggestion == null)
                return (false, "Suggestion not found.");

            // One review per suggestion — re-reviews would re-publish or
            // overwrite the recorded outcome.
            if (suggestion.Status != "Pending")
                return (false, "This suggestion has already been reviewed.");

            suggestion.Status = cleanStatus;
            suggestion.ReviewNote = note;
            suggestion.ReviewedByAdminId = adminId;
            suggestion.ReviewedAt = DateTime.UtcNow;
            suggestion.UpdatedAt = DateTime.UtcNow;

            int? newsId = null;
            if (cleanStatus == "Approved")
            {
                // Publish to the Community feed as a normal post: same
                // CREATE_NEWS log, same "new post" notification to students,
                // and the suggestion's image carries over.
                var created = await _newsService.CreateNewsAsync(
                    new CreateNewsRequest
                    {
                        Title = suggestion.Title,
                        Content = suggestion.Content,
                        IsPublished = true
                    },
                    adminId,
                    suggestion.ImagePath);

                newsId = created.Id;
                suggestion.NewsId = created.Id;
            }

            await _suggestions.UpdateAsync(suggestion);

            await _activityLogs.LogAdminAsync(
                adminId,
                "REVIEW_SUGGESTION",
                cleanStatus == "Approved"
                    ? $"Approved post suggestion: {suggestion.Title}"
                    : $"Rejected post suggestion: {suggestion.Title} - {note}",
                ipAddress);

            await _notifications.NotifySuggestionReviewedAsync(
                suggestion.StudentId, cleanStatus == "Approved",
                suggestion.Title, note, newsId);

            return (true, cleanStatus == "Approved"
                ? "Suggestion approved and published."
                : "Suggestion rejected.");
        }

        private static NewsSuggestionMyDto MapMy(Domain.Entities.NewsSuggestion s) => new()
        {
            Id = s.Id,
            Title = s.Title,
            Content = s.Content,
            ImagePath = s.ImagePath,
            Status = s.Status,
            ReviewNote = s.ReviewNote,
            ReviewedAt = s.ReviewedAt,
            NewsId = s.NewsId,
            CreatedAt = s.CreatedAt
        };

        private static NewsSuggestionRowDto MapRow(Domain.Entities.NewsSuggestion s) => new()
        {
            Id = s.Id,
            StudentId = s.StudentId,
            FullName = s.Student?.FullName ?? string.Empty,
            StudentNumber = s.Student?.StudentNumber ?? string.Empty,
            Email = s.Student?.Email ?? string.Empty,
            Title = s.Title,
            Content = s.Content,
            ImagePath = s.ImagePath,
            Status = s.Status,
            ReviewNote = s.ReviewNote,
            ReviewedByName = s.ReviewedByAdmin?.FullName,
            ReviewedAt = s.ReviewedAt,
            NewsId = s.NewsId,
            CreatedAt = s.CreatedAt
        };
    }
}

using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Shared.DTOs;

namespace MyApp.Application.Services
{
    public class NewsService : INewsService
    {
        private readonly INewsRepository _newsRepository;
        private readonly IActivityLogRepository _activityLogRepository;
        private readonly INotificationService _notificationService;
        private readonly IStudentRepository _studentRepository;
        private const int PageSize = 10;

        public NewsService(
            INewsRepository newsRepository,
            IActivityLogRepository activityLogRepository,
            INotificationService notificationService,
            IStudentRepository studentRepository)
        {
            _newsRepository = newsRepository;
            _activityLogRepository = activityLogRepository;
            _notificationService = notificationService;
            _studentRepository = studentRepository;
        }

        public async Task<(List<NewsDto> Items, int TotalCount)> GetNewsAsync(int page, int studentId, string? search = null)
        {
            var newsList = await _newsRepository.GetPublishedAsync(page, PageSize, search);
            var total = await _newsRepository.GetTotalCountAsync(search);

            var items = newsList.Select(n => new NewsDto
            {
                Id = n.Id,
                Title = n.Title,
                Content = n.Content,
                ImagePath = n.ImagePath,
                PostedByAdminName = n.PostedByAdmin.FullName,
                PostedAt = n.PostedAt,
                HeartCount = n.Hearts.Count,
                IsHearted = n.Hearts.Any(h => h.StudentId == studentId),
                CommentCount = n.Comments.Count(c => !c.IsDeleted)
            }).ToList();

            return (items, total);
        }

        public async Task<NewsDetailDto?> GetNewsByIdAsync(int newsId, int studentId)
        {
            var news = await _newsRepository.GetByIdAsync(newsId);
            if (news == null) return null;

            return new NewsDetailDto
            {
                Id = news.Id,
                Title = news.Title,
                Content = news.Content,
                ImagePath = news.ImagePath,
                PostedByAdminName = news.PostedByAdmin.FullName,
                PostedAt = news.PostedAt,
                HeartCount = news.Hearts.Count,
                IsHearted = news.Hearts.Any(h => h.StudentId == studentId),
                Comments = news.Comments
                    .Where(c => !c.IsDeleted && c.ParentCommentId == null)
                    .OrderBy(c => c.CommentedAt)
                    .Select(c => new NewsCommentDto
                    {
                        Id = c.Id,
                        StudentId = c.StudentId,
                        StudentName = c.Student.FullName,
                        Comment = c.Comment,
                        CommentedAt = c.CommentedAt,
                        LikeCount = c.Likes.Count,
                        IsLiked = c.Likes.Any(l => l.StudentId == studentId),
                        ParentCommentId = null,
                        Replies = c.Replies
                            .Where(r => !r.IsDeleted)
                            .OrderBy(r => r.CommentedAt)
                            .Select(r => new NewsCommentDto
                            {
                                Id = r.Id,
                                StudentId = r.StudentId,
                                StudentName = r.Student.FullName,
                                Comment = r.Comment,
                                CommentedAt = r.CommentedAt,
                                LikeCount = r.Likes.Count,
                                IsLiked = r.Likes.Any(l => l.StudentId == studentId),
                                ParentCommentId = c.Id,
                                MentionedStudentName = r.MentionedStudent?.FullName,
                                Replies = r.Replies
                                    .Where(rr => !rr.IsDeleted)
                                    .OrderBy(rr => rr.CommentedAt)
                                    .Select(rr => new NewsCommentDto
                                    {
                                        Id = rr.Id,
                                        StudentId = rr.StudentId,
                                        StudentName = rr.Student.FullName,
                                        Comment = rr.Comment,
                                        CommentedAt = rr.CommentedAt,
                                        LikeCount = rr.Likes.Count,
                                        IsLiked = rr.Likes.Any(l => l.StudentId == studentId),
                                        ParentCommentId = r.Id,
                                        MentionedStudentName = rr.MentionedStudent?.FullName
                                    }).ToList()
                            }).ToList()
                    }).ToList()
            };
        }

        public async Task<NewsDto> CreateNewsAsync(CreateNewsRequest request, int adminId, string? imagePath)
        {
            var news = new News
            {
                Title = request.Title,
                Content = request.Content,
                ImagePath = imagePath,
                PostedByAdminId = adminId,
                IsPublished = request.IsPublished,
                PostedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _newsRepository.CreateAsync(news);
            await _activityLogRepository.LogAdminAsync(adminId, "CREATE_NEWS", $"Created news: {request.Title}", "system");
            await _notificationService.NotifyNewsPostedAsync(news.Title, news.Id);

            return new NewsDto
            {
                Id = news.Id,
                Title = news.Title,
                Content = news.Content,
                ImagePath = news.ImagePath,
                PostedAt = news.PostedAt
            };
        }

        public async Task<bool> ToggleHeartAsync(int newsId, int studentId)
        {
            var existing = await _newsRepository.GetHeartAsync(newsId, studentId);

            if (existing != null)
            {
                await _newsRepository.RemoveHeartAsync(existing);
                return false; // unhearted
            }

            await _newsRepository.AddHeartAsync(new NewsHeart
            {
                NewsId = newsId,
                StudentId = studentId,
                CreatedAt = DateTime.UtcNow
            });

            await _activityLogRepository.LogStudentAsync(studentId, "HEART_NEWS", $"Hearted news ID: {newsId}", "system");
            return true; // hearted
        }

        public async Task<NewsCommentDto> AddCommentAsync(int newsId, int studentId, AddCommentRequest request, string ipAddress)
        {
            var comment = new NewsComment
            {
                NewsId = newsId,
                StudentId = studentId,
                ParentCommentId = request.ParentCommentId,
                MentionedStudentId = request.MentionedStudentId,
                Comment = request.Comment,
                CommentedAt = DateTime.UtcNow
            };

            await _newsRepository.AddCommentAsync(comment);
            await _activityLogRepository.LogStudentAsync(studentId, "ADD_COMMENT",
                $"Commented on news ID: {newsId}", ipAddress);

            // Fetch saved comment with student info
            var saved = await _newsRepository.GetCommentByIdAsync(comment.Id);

            // Notify parent comment author if this is a reply
            if (request.ParentCommentId.HasValue)
            {
                var parentComment = await _newsRepository.GetCommentByIdAsync(request.ParentCommentId.Value);
                if (parentComment != null && parentComment.StudentId != studentId)
                {
                    var parentAuthor = await _studentRepository.GetByIdAsync(parentComment.StudentId);
                    var news = await _newsRepository.GetByIdAsync(newsId);
                    if (parentAuthor != null && news != null)
                    {
                        await _notificationService.NotifyCommentReplyAsync(
                            parentAuthor.Id,
                            parentAuthor.Email,
                            saved?.Student?.FullName ?? "Someone",
                            news.Title,
                            newsId);
                    }
                }
            }

            // Notify mentioned student
            if (request.MentionedStudentId.HasValue && request.MentionedStudentId.Value != studentId)
            {
                var mentionedStudent = await _studentRepository.GetByIdAsync(request.MentionedStudentId.Value);
                var news = await _newsRepository.GetByIdAsync(newsId);
                if (mentionedStudent != null && news != null)
                {
                    await _notificationService.NotifyMentionAsync(
                        mentionedStudent.Id,
                        mentionedStudent.Email,
                        saved?.Student?.FullName ?? "Someone",
                        news.Title,
                        newsId);
                }
            }

            return new NewsCommentDto
            {
                Id = comment.Id,
                StudentId = studentId,
                StudentName = saved?.Student?.FullName ?? string.Empty,
                Comment = comment.Comment,
                CommentedAt = comment.CommentedAt,
                LikeCount = 0,
                IsLiked = false,
                ParentCommentId = request.ParentCommentId,
                MentionedStudentName = saved?.MentionedStudent?.FullName
            };
        }

        public async Task<bool> DeleteCommentAsync(int commentId)
        {
            var comment = await _newsRepository.GetCommentByIdAsync(commentId);
            if (comment == null) return false;

            comment.IsDeleted = true;
            await _newsRepository.UpdateCommentAsync(comment);
            return true;
        }

        public async Task<bool> UpdateNewsAsync(int newsId, CreateNewsRequest request, string? imagePath)
        {
            var news = await _newsRepository.GetByIdAsync(newsId);
            if (news == null) return false;

            news.Title = request.Title;
            news.Content = request.Content;
            news.IsPublished = request.IsPublished;
            news.UpdatedAt = DateTime.UtcNow;
            if (imagePath != null) news.ImagePath = imagePath;

            await _newsRepository.UpdateAsync(news);
            await _activityLogRepository.LogAdminAsync(0, "UPDATE_NEWS", $"Updated news: {request.Title}", "system");
            return true;
        }

        public async Task<bool> DeleteNewsAsync(int newsId)
        {
            var news = await _newsRepository.GetByIdAsync(newsId);
            if (news == null) return false;

            await _newsRepository.DeleteAsync(news);
            await _activityLogRepository.LogAdminAsync(0, "DELETE_NEWS", $"Deleted news ID: {newsId}", "system");
            return true;
        }

        public async Task<bool> SoftDeleteNewsAsync(int id)
        {
            var news = await _newsRepository.GetByIdAsync(id);
            if (news == null) return false;

            news.IsDeleted = true;
            await _newsRepository.UpdateAsync(news);
            return true;
        }

        public async Task<bool> RestoreNewsAsync(int id)
        {
            var news = await _newsRepository.GetByIdIncludingDeletedAsync(id);
            if (news == null || !news.IsDeleted) return false;

            news.IsDeleted = false;
            await _newsRepository.UpdateAsync(news);
            return true;
        }

        public async Task<bool> PermanentlyDeleteNewsAsync(int id)
        {
            var news = await _newsRepository.GetByIdIncludingDeletedAsync(id);
            if (news == null) return false;

            await _newsRepository.DeleteAsync(news);
            return true;
        }

        public async Task<List<NewsDto>> GetDeletedNewsAsync()
        {
            var newsList = await _newsRepository.GetDeletedAsync();
            return newsList.Select(n => new NewsDto
            {
                Id = n.Id,
                Title = n.Title,
                Content = n.Content,
                ImagePath = n.ImagePath,
                PostedByAdminName = n.PostedByAdmin.FullName,
                PostedAt = n.PostedAt,
                HeartCount = n.Hearts.Count,
                CommentCount = 0 // not needed in trash view
            }).ToList();
        }

        public async Task<bool> ToggleCommentLikeAsync(int commentId, int studentId)
        {
            var existing = await _newsRepository.GetCommentLikeAsync(commentId, studentId);
            if (existing != null)
            {
                await _newsRepository.RemoveCommentLikeAsync(existing);
                return false;
            }

            await _newsRepository.AddCommentLikeAsync(new NewsCommentLike
            {
                CommentId = commentId,
                StudentId = studentId,
                CreatedAt = DateTime.UtcNow
            });

            await _activityLogRepository.LogStudentAsync(studentId, "LIKE_COMMENT",
                $"Liked comment ID: {commentId}", "system");
            return true;
        }

        public async Task<bool> EditCommentAsync(int commentId, int studentId, EditCommentRequest request)
        {
            var comment = await _newsRepository.GetCommentByIdAsync(commentId);
            if (comment == null || comment.StudentId != studentId) return false;

            comment.Comment = request.Comment;
            await _newsRepository.UpdateCommentAsync(comment);
            await _activityLogRepository.LogStudentAsync(studentId, "EDIT_COMMENT",
                $"Edited comment ID: {commentId}", "system");
            return true;
        }

        public async Task<bool> DeleteCommentAsync(int commentId, int studentId)
        {
            var comment = await _newsRepository.GetCommentByIdAsync(commentId);
            if (comment == null || comment.StudentId != studentId) return false;

            comment.IsDeleted = true;
            await _newsRepository.UpdateCommentAsync(comment);
            await _activityLogRepository.LogStudentAsync(studentId, "DELETE_COMMENT",
                $"Deleted comment ID: {commentId}", "system");
            return true;
        }

        public async Task<bool> DeleteCommentAsAdminAsync(int commentId, int adminId)
        {
            var comment = await _newsRepository.GetCommentByIdAsync(commentId);
            if (comment == null) return false;

            comment.IsDeleted = true;
            await _newsRepository.UpdateCommentAsync(comment);
            await _activityLogRepository.LogAdminAsync(adminId, "ADMIN_DELETE_COMMENT",
                $"Admin deleted comment ID: {commentId}", "system");
            return true;
        }
    }
}
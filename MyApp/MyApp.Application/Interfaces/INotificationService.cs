using MyApp.Shared.DTOs;

namespace MyApp.Application.Interfaces
{
    public interface INotificationService
    {
        Task<List<NotificationDto>> GetMyNotificationsAsync(int studentId);
        Task<int> GetUnreadCountAsync(int studentId);
        Task<bool> MarkAsReadAsync(int notificationId, int studentId);
        Task MarkAllAsReadAsync(int studentId);
        Task NotifyApplicationStatusChangeAsync(int studentId, string studentEmail, string jobTitle, string status, int applicationId);
        Task NotifyCommentReplyAsync(int parentAuthorStudentId, string parentAuthorEmail, string replierName, string newsTitle, int newsId);
        Task NotifyMentionAsync(int mentionedStudentId, string mentionedStudentEmail, string mentionerName, string newsTitle, int newsId);
        Task NotifyNewsPostedAsync(string newsTitle, int newsId);
        Task NotifyJobPostedAsync(string jobTitle, int jobId);
    }
}
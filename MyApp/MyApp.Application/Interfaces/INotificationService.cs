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
        Task NotifyEventPostedAsync(string eventTitle, int eventId);
        Task NotifySuggestionReviewedAsync(int studentId, bool approved, string title, string? note, int? newsId);
        Task<(bool Sent, string Message)> NotifyCareerReminderAsync(int studentId, bool needsResubmission);

        // Cooldown lookup for the admin reminder buttons: studentId -> newest
        // active career reminder (unread or sent within the cooldown window).
        // `reminderType` narrows to one kind (e.g. CAREER_RESUBMIT_REMINDER).
        Task<IReadOnlyDictionary<int, DateTime>> GetActiveCareerRemindersAsync(
            IEnumerable<int> studentIds, string? reminderType = null);
        Task MaybeNudgeResumeAsync(int studentId);
        Task RegisterPushTokenAsync(int studentId, string token, string platform);
        Task UnregisterPushTokenAsync(string token);
    }
}

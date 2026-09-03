using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Shared.DTOs;

namespace MyApp.Application.Services
{
    public class NotificationService : INotificationService
    {
        private readonly INotificationRepository _notificationRepository;
        private readonly IEmailService _emailService;
        private readonly IStudentRepository _studentRepository;
        private readonly IPushTokenRepository _pushTokenRepository;
        private readonly IPushService _pushService;

        public NotificationService(
            INotificationRepository notificationRepository,
            IEmailService emailService,
            IStudentRepository studentRepository,
            IPushTokenRepository pushTokenRepository,
            IPushService pushService)
        {
            _notificationRepository = notificationRepository;
            _emailService = emailService;
            _studentRepository = studentRepository;
            _pushTokenRepository = pushTokenRepository;
            _pushService = pushService;
        }

        public async Task<List<NotificationDto>> GetMyNotificationsAsync(int studentId)
        {
            var notifications = await _notificationRepository.GetByStudentIdAsync(studentId);

            return notifications.Select(n => new NotificationDto
            {
                Id = n.Id,
                Title = n.Title,
                Message = n.Message,
                Type = n.Type,
                RelatedId = n.RelatedId,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt
            }).ToList();
        }

        public async Task<int> GetUnreadCountAsync(int studentId)
        {
            return await _notificationRepository.GetUnreadCountAsync(studentId);
        }

        public async Task<bool> MarkAsReadAsync(int notificationId, int studentId)
        {
            var notification = await _notificationRepository.GetByIdAsync(notificationId);
            if (notification == null || notification.StudentId != studentId) return false;

            await _notificationRepository.MarkAsReadAsync(notification);
            return true;
        }

        public async Task MarkAllAsReadAsync(int studentId)
        {
            await _notificationRepository.MarkAllAsReadAsync(studentId);
        }

        public async Task RegisterPushTokenAsync(int studentId, string token, string platform)
        {
            await _pushTokenRepository.UpsertAsync(studentId, token, platform);
        }

        public async Task UnregisterPushTokenAsync(string token)
        {
            await _pushTokenRepository.DeleteByTokenAsync(token);
        }

        public async Task NotifyApplicationStatusChangeAsync(int studentId, string studentEmail, string jobTitle,
            string status, int applicationId)
        {
            // 1. Create in-app notification
            var notification = new Notification
            {
                StudentId = studentId,
                Title = "Application Status Updated",
                Message = $"Your application for \"{jobTitle}\" is now: {status}",
                Type = "APPLICATION_STATUS",
                RelatedId = applicationId,
                CreatedAt = DateTime.UtcNow
            };
            await _notificationRepository.CreateAsync(notification);

            // 2. Send email
            var subject = $"Update on your application for {jobTitle}";
            var body = $"Hello,\n\nYour application for \"{jobTitle}\" has been updated to: {status}.\n\n" +
                       $"Please check the alumni app for more details.\n\nThank you.";

            await _emailService.SendEmailAsync(studentEmail, subject, body);

            // 3. Send device push
            var tokens = await _pushTokenRepository.GetTokensByStudentIdAsync(studentId);
            await _pushService.SendAsync(tokens, notification.Title, notification.Message,
                notification.Type, notification.RelatedId);
        }

        public async Task NotifyCommentReplyAsync(int parentAuthorStudentId, string parentAuthorEmail,
            string replierName, string newsTitle, int newsId)
        {
            // In-app notification
            var notification = new Notification
            {
                StudentId = parentAuthorStudentId,
                Title = "New Reply",
                Message = $"{replierName} replied to your comment on \"{newsTitle}\"",
                Type = "COMMENT_REPLY",
                RelatedId = newsId,
                CreatedAt = DateTime.UtcNow
            };
            await _notificationRepository.CreateAsync(notification);

            // Email
            await _emailService.SendEmailAsync(parentAuthorEmail,
                $"New reply on \"{newsTitle}\"",
                $"{replierName} replied to your comment on \"{newsTitle}\".\n\nCheck the alumni app for details.");

            // Device push
            var tokens = await _pushTokenRepository.GetTokensByStudentIdAsync(parentAuthorStudentId);
            await _pushService.SendAsync(tokens, notification.Title, notification.Message,
                notification.Type, notification.RelatedId);
        }

        public async Task NotifyMentionAsync(int mentionedStudentId, string mentionedStudentEmail,
            string mentionerName, string newsTitle, int newsId)
        {
            var notification = new Notification
            {
                StudentId = mentionedStudentId,
                Title = "You were mentioned",
                Message = $"{mentionerName} mentioned you in a comment on \"{newsTitle}\"",
                Type = "MENTION",
                RelatedId = newsId,
                CreatedAt = DateTime.UtcNow
            };
            await _notificationRepository.CreateAsync(notification);

            await _emailService.SendEmailAsync(mentionedStudentEmail,
                $"You were mentioned in \"{newsTitle}\"",
                $"{mentionerName} mentioned you in a comment on \"{newsTitle}\".\n\nCheck the alumni app for details.");

            var tokens = await _pushTokenRepository.GetTokensByStudentIdAsync(mentionedStudentId);
            await _pushService.SendAsync(tokens, notification.Title, notification.Message,
                notification.Type, notification.RelatedId);
        }

        public async Task NotifyNewsPostedAsync(string newsTitle, int newsId)
        {
            var allStudents = await _studentRepository.GetAllAsync();
            var targets = allStudents.Where(s => s.IsActive).ToList();

            foreach (var student in targets)
            {
                await _notificationRepository.CreateAsync(new Notification
                {
                    StudentId = student.Id,
                    Title = "New Post",
                    Message = $"New news post: \"{newsTitle}\"",
                    Type = "NEWS",
                    RelatedId = newsId,
                    CreatedAt = DateTime.UtcNow
                });
            }

            var tokens = await _pushTokenRepository.GetTokensForActiveStudentsAsync(graduatesOnly: false);
            await _pushService.SendAsync(tokens, "New Post", $"New news post: \"{newsTitle}\"", "NEWS", newsId);
        }

        public async Task NotifyJobPostedAsync(string jobTitle, int jobId)
        {
            var allStudents = await _studentRepository.GetAllAsync();
            var targets = allStudents.Where(s => s.IsActive &&
                s.SchoolYear.Trim().Equals("Graduate", StringComparison.OrdinalIgnoreCase)).ToList();

            foreach (var student in targets)
            {
                await _notificationRepository.CreateAsync(new Notification
                {
                    StudentId = student.Id,
                    Title = "New Job",
                    Message = $"New job listing: \"{jobTitle}\"",
                    Type = "JOB",
                    RelatedId = jobId,
                    CreatedAt = DateTime.UtcNow
                });
            }

            var tokens = await _pushTokenRepository.GetTokensForActiveStudentsAsync(graduatesOnly: true);
            await _pushService.SendAsync(tokens, "New Job", $"New job listing: \"{jobTitle}\"", "JOB", jobId);
        }

        public async Task NotifyEventPostedAsync(string eventTitle, int eventId)
        {
            var allStudents = await _studentRepository.GetAllAsync();
            var targets = allStudents.Where(s => s.IsActive).ToList();

            foreach (var student in targets)
            {
                await _notificationRepository.CreateAsync(new Notification
                {
                    StudentId = student.Id,
                    Title = "New Event",
                    Message = $"New alumni event: \"{eventTitle}\"",
                    Type = "EVENT",
                    RelatedId = eventId,
                    CreatedAt = DateTime.UtcNow
                });
            }

            var tokens = await _pushTokenRepository.GetTokensForActiveStudentsAsync(graduatesOnly: false);
            await _pushService.SendAsync(tokens, "New Event", $"New alumni event: \"{eventTitle}\"", "EVENT", eventId);
        }
    }
}

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

        public NotificationService(
            INotificationRepository notificationRepository,
            IEmailService emailService,
            IStudentRepository studentRepository)
        {
            _notificationRepository = notificationRepository;
            _emailService = emailService;
            _studentRepository = studentRepository;
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
        }

        public async Task NotifyCommentReplyAsync(int parentAuthorStudentId, string parentAuthorEmail,
            string replierName, string newsTitle, int newsId)
        {
            // In-app notification
            await _notificationRepository.CreateAsync(new Notification
            {
                StudentId = parentAuthorStudentId,
                Title = "New Reply",
                Message = $"{replierName} replied to your comment on \"{newsTitle}\"",
                Type = "COMMENT_REPLY",
                RelatedId = newsId,
                CreatedAt = DateTime.UtcNow
            });

            // Email
            await _emailService.SendEmailAsync(parentAuthorEmail,
                $"New reply on \"{newsTitle}\"",
                $"{replierName} replied to your comment on \"{newsTitle}\".\n\nCheck the alumni app for details.");
        }

        public async Task NotifyMentionAsync(int mentionedStudentId, string mentionedStudentEmail,
            string mentionerName, string newsTitle, int newsId)
        {
            await _notificationRepository.CreateAsync(new Notification
            {
                StudentId = mentionedStudentId,
                Title = "You were mentioned",
                Message = $"{mentionerName} mentioned you in a comment on \"{newsTitle}\"",
                Type = "MENTION",
                RelatedId = newsId,
                CreatedAt = DateTime.UtcNow
            });

            await _emailService.SendEmailAsync(mentionedStudentEmail,
                $"You were mentioned in \"{newsTitle}\"",
                $"{mentionerName} mentioned you in a comment on \"{newsTitle}\".\n\nCheck the alumni app for details.");
        }

        public async Task NotifyNewsPostedAsync(string newsTitle, int newsId)
        {
            var allStudents = await _studentRepository.GetAllAsync();
            foreach (var student in allStudents.Where(s => s.IsActive))
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
        }

        public async Task NotifyJobPostedAsync(string jobTitle, int jobId)
        {
            var allStudents = await _studentRepository.GetAllAsync();
            foreach (var student in allStudents.Where(s => s.IsActive &&
                s.SchoolYear.Trim().Equals("Graduate", StringComparison.OrdinalIgnoreCase)))
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
        }
    }
}
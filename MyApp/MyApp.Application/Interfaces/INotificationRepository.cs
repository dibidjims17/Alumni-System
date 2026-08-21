using MyApp.Domain.Entities;

namespace MyApp.Application.Interfaces
{
    public interface INotificationRepository
    {
        Task<List<Notification>> GetByStudentIdAsync(int studentId);
        Task<int> GetUnreadCountAsync(int studentId);
        Task<Notification?> GetByIdAsync(int id);
        Task CreateAsync(Notification notification);
        Task MarkAsReadAsync(Notification notification);
        Task MarkAllAsReadAsync(int studentId);
    }
}
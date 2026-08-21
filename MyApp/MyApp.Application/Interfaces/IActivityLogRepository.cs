using MyApp.Domain.Entities;

namespace MyApp.Application.Interfaces
{
    public interface IActivityLogRepository
    {
        Task LogStudentAsync(int studentId, string action, string details, string ipAddress);
        Task LogAdminAsync(int adminId, string action, string details, string ipAddress);
        Task<List<ActivityLog>> GetAllAsync(int page, int pageSize);
        Task<int> GetTotalCountAsync();
    }
}
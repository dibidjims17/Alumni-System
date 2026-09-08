using MyApp.Domain.Entities;

namespace MyApp.Application.Interfaces
{
    public interface IYearLevelChangeRepository
    {
        Task<YearLevelChangeRequest?> GetPendingByStudentAsync(int studentId);
        Task<YearLevelChangeRequest?> GetByIdAsync(int id);
        Task<List<YearLevelChangeRequest>> GetByStatusAsync(string? status);
        Task<List<YearLevelChangeRequest>> GetByStudentAsync(int studentId);
        Task CreateAsync(YearLevelChangeRequest request);
        Task UpdateAsync(YearLevelChangeRequest request);
    }
}

using MyApp.Domain.Entities;

namespace MyApp.Application.Interfaces
{
    public interface ICareerRepository
    {
        // Newest submission for a student — the record the app shows them.
        Task<CareerRecord?> GetLatestByStudentAsync(int studentId);
        Task<IReadOnlyDictionary<int, CareerRecord>> GetLatestByStudentIdsAsync(IEnumerable<int> studentIds);
        Task<CareerRecord?> GetByIdAsync(int id);

        // Admin queue, newest first, optionally filtered by review status.
        Task<List<CareerRecord>> GetAllAsync(string? status);

        // Every record ever submitted. Used to derive "latest per student"
        // for the stats — kept separate from GetAllAsync so filtering by
        // status can never skew the numbers.
        Task<List<CareerRecord>> GetHistoryAsync();

        Task CreateAsync(CareerRecord record);
        Task UpdateAsync(CareerRecord record);
    }
}

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

        // Records submitted within [from, to), newest first, with the
        // student join — backs the month-scoped report and its CSV.
        Task<List<CareerRecord>> GetSubmittedBetweenAsync(DateTime from, DateTime to);

        // Reviews completed within [from, to) regardless of submission date
        // — the registrar's processing workload for the month.
        Task<int> CountReviewedBetweenAsync(DateTime from, DateTime to);

        // Fast pending count — how many students have a Pending newest record.
        // This matches the Dashboard's CareerStatsDto.Pending computation:
        // latest.Count(r => r.Status == "Pending") where latest = newest per student.
        Task<int> CountPendingLatestAsync();

        Task CreateAsync(CareerRecord record);
        Task UpdateAsync(CareerRecord record);
    }
}

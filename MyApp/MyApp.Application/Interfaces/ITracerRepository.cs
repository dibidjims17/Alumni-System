using MyApp.Domain.Entities;

namespace MyApp.Application.Interfaces
{
    public interface ITracerRepository
    {
        // The student's single tracer row (draft or submitted), or null when
        // they have never answered.
        Task<TracerResponse?> GetByStudentAsync(int studentId);

        // Drives the login flag: has this student ever submitted?
        Task<bool> IsSubmittedAsync(int studentId);

        Task CreateAsync(TracerResponse response);
        Task UpdateAsync(TracerResponse response);

        // ---- Admin reporting (P3) ----

        // Paged responses joined with Student for the admin table, filtered
        // and ordered most-recently-updated first.
        Task<(List<TracerResponse> Items, int Total)> GetAdminResponsesAsync(
            int page, int pageSize, string? search, string? status,
            string? employment, string? relatedness, string? program);

        // Every response with its Student — feeds stats and the CSV export.
        // School-size data, so in-memory aggregation beats SQL gymnastics.
        Task<List<TracerResponse>> GetAllWithStudentsAsync();

        // Response-rate denominator: registered, active graduates.
        Task<int> GetGraduateCountAsync();

        // Program filter options for the admin table.
        Task<List<string>> GetGraduateProgramsAsync();
    }
}

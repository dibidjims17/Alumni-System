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
    }
}

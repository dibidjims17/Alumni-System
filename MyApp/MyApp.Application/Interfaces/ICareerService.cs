using MyApp.Shared.DTOs;

namespace MyApp.Application.Interfaces
{
    public interface ICareerService
    {
        // The student's newest submission, or null if they never submitted.
        Task<CareerRecordDto?> GetMyRecordAsync(int studentId);

        // Adds a submission, or refreshes the student's existing Pending one
        // so a student can only ever have a single record awaiting review.
        Task<(bool Success, string Message, CareerRecordDto? Record)> SubmitProofAsync(
            int studentId, CareerSubmitRequest request, string ipAddress);

        Task<List<CareerRecordDto>> GetQueueAsync(string? status, string? search);
        Task<CareerRecordDto?> GetByIdAsync(int id);

        Task<(bool Success, string Message)> ReviewAsync(
            int recordId, CareerReviewRequest request, int adminId, string ipAddress);

        Task<CareerStatsDto> GetStatsAsync();
    }
}

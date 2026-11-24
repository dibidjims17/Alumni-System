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

        Task<(bool Success, string Message)> SendReminderAsync(
            int studentId, int adminId, string ipAddress);

        // Graduates with no career submission at all — the "not reported"
        // rows on the admin Careers page, with reminder cooldown state.
        Task<List<CareerNotReportedDto>> GetNotReportedAsync();

        // One bulk send to every graduate without a submission. Students in
        // cooldown are skipped, not failed; returns per-outcome counts.
        Task<(int Sent, int Skipped, int Failed, string Message)> RemindAllNotReportedAsync(
            int adminId, string ipAddress);

        Task<CareerStatsDto> GetStatsAsync();

        // Month-scoped report (registrar deliverable): submissions received
        // in the month, review workload, distributions and the rows.
        Task<CareerReportDto?> GetReportAsync(int year, int month);

        // UTF-8 BOM CSV of the same rows; logs EXPORT_CAREER.
        Task<(string Csv, int RowCount)> BuildExportCsvAsync(
            int year, int month, int adminId);
    }
}

using MyApp.Shared.DTOs;

namespace MyApp.Application.Interfaces
{
    public interface ITracerService
    {
        // What the mobile gate reads: completed / required / resume step.
        Task<TracerStatusDto> GetStatusAsync(int studentId, bool isGraduate);

        // Saved answers so far, or null when nothing has been answered yet.
        Task<TracerAnswersDto?> GetDraftAsync(int studentId);

        // Overwrite the single answer row with the full answer set (the
        // client sends everything it holds on every step change). Also the
        // save path while editing an already-submitted response — Status is
        // never demoted, so the gate stays open mid-edit.
        Task<(bool Success, string Message)> SaveDraftAsync(
            int studentId, TracerAnswersDto answers, string ipAddress);

        // Validate all five steps against the questionnaire rules, then
        // flip Draft -> Submitted (this is what lifts the gate). Submitting
        // again updates an existing response (edit after submit, §8 Q2).
        Task<(bool Success, string Message)> SubmitAsync(
            int studentId, TracerAnswersDto answers, string ipAddress);

        // The submitted answers (or null) — Profile view / GET me.
        Task<TracerAnswersDto?> GetMyAnswersAsync(int studentId);

        // ---- Admin reporting (SuperAdmin + Staff read-only) ----

        // Paged, filtered response rows for the admin table.
        Task<(List<TracerResponseRowDto> Items, int Total)> GetAdminResponsesAsync(
            int page, string? search, string? status, string? employment,
            string? relatedness, string? program);

        // Participation + outcome stats for the Tracer Study screen.
        Task<TracerAdminStatsDto> GetAdminStatsAsync();

        // Flat CSV of every response (the school deliverable). Writes an
        // EXPORT_TRACER activity-log entry like other admin exports.
        Task<(string Csv, int RowCount)> BuildExportCsvAsync(int adminId);

        // Admin cleanup: remove a response row (smoke-test leftovers, wrong
        // submissions) so the gate re-locks and reports stay clean. Writes a
        // DELETE_TRACER activity-log entry.
        Task<(bool Success, string Message)> DeleteResponseAsync(
            int id, int adminId, string ipAddress);
    }
}

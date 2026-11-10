using MyApp.Shared.DTOs;

namespace MyApp.Application.Interfaces
{
    public interface ITracerService
    {
        // What the mobile gate reads: completed / required / resume step.
        Task<TracerStatusDto> GetStatusAsync(int studentId, bool isGraduate);

        // Saved answers so far, or null when nothing has been answered yet.
        Task<TracerAnswersDto?> GetDraftAsync(int studentId);

        // Overwrite the single draft row with the full answer set (the
        // client sends everything it holds on every step change).
        Task<(bool Success, string Message)> SaveDraftAsync(
            int studentId, TracerAnswersDto answers, string ipAddress);

        // Validate all five steps against the questionnaire rules, then
        // flip Draft -> Submitted (this is what lifts the gate).
        Task<(bool Success, string Message)> SubmitAsync(
            int studentId, TracerAnswersDto answers, string ipAddress);

        // The submitted answers (or null) — Profile view / GET me.
        Task<TracerAnswersDto?> GetMyAnswersAsync(int studentId);
    }
}

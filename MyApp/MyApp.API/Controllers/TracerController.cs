using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyApp.Application.Interfaces;
using MyApp.Shared.DTOs;

namespace MyApp.API.Controllers
{
    // Graduate Tracer Study — the pre-screening questionnaire every graduate
    // must complete before the mobile app unlocks (school requirement). The
    // gate itself is client-side (AppNavigator reads `tracerCompleted` from
    // the login payload); these endpoints serve the step data, the draft
    // and the final submit.
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TracerController : ControllerBase
    {
        private readonly ITracerService _tracerService;

        public TracerController(ITracerService tracerService)
        {
            _tracerService = tracerService;
        }

        private int GetStudentId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        private bool IsGraduate() =>
            User.FindFirstValue("SchoolYear") == "Graduate";

        private string IpAddress() =>
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        // Gate state: completed / required / which step to resume at.
        // Non-graduates get completed=true so they never see the gate.
        [Authorize(Roles = "Student")]
        [HttpGet("status")]
        public async Task<IActionResult> GetStatus()
        {
            var status = await _tracerService.GetStatusAsync(GetStudentId(), IsGraduate());
            return Ok(status);
        }

        // Saved answers so far, or null when nothing has been answered yet.
        // 200-with-null keeps the mobile flow to a single call shape, same
        // convention as CareerController.my-record.
        [Authorize(Roles = "Student")]
        [HttpGet("draft")]
        public async Task<IActionResult> GetDraft()
        {
            var draft = await _tracerService.GetDraftAsync(GetStudentId());
            return Ok(draft);
        }

        // Auto-save on every Next/Back: the client sends the full answer
        // set it holds (overwrite semantics), so a partial save can never
        // leave stale values behind. No strict validation here — the user
        // is mid-flow; validation happens on submit.
        [Authorize(Roles = "Student")]
        [HttpPut("draft")]
        public async Task<IActionResult> SaveDraft([FromBody] TracerAnswersDto answers)
        {
            var (success, message) = await _tracerService.SaveDraftAsync(
                GetStudentId(), answers, IpAddress());

            if (!success) return BadRequest(new { message });
            return Ok(new { message });
        }

        // Final submit: validates Sections A–E, flips Draft -> Submitted,
        // and lifts the gate (tracerCompleted becomes true on next login).
        [Authorize(Roles = "Student")]
        [HttpPost("submit")]
        public async Task<IActionResult> Submit([FromBody] TracerAnswersDto answers)
        {
            var (success, message) = await _tracerService.SubmitAsync(
                GetStudentId(), answers, IpAddress());

            if (!success) return BadRequest(new { message });
            return Ok(new { message });
        }

        // The submitted answers (or null) — Profile view / review screen.
        [Authorize(Roles = "Student")]
        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var answers = await _tracerService.GetMyAnswersAsync(GetStudentId());
            return Ok(answers);
        }

        // ------------------------------------------------------------------
        // Admin reporting (P3) — SuperAdmin + Staff read-only.
        // The gate keeps students out; admins never touch student sessions,
        // so these use the admin claim instead of GetStudentId().
        // ------------------------------------------------------------------

        private int GetAdminId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // Paged, filtered responses for the admin table.
        // GET /api/Tracer/responses?page=1&search=&status=&employment=&relatedness=&program=
        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpGet("responses")]
        public async Task<IActionResult> GetResponses(
            [FromQuery] int page = 1,
            [FromQuery] string? search = null,
            [FromQuery] string? status = null,
            [FromQuery] string? employment = null,
            [FromQuery] string? relatedness = null,
            [FromQuery] string? program = null)
        {
            var (items, total) = await _tracerService.GetAdminResponsesAsync(
                page, search, status, employment, relatedness, program);

            return Ok(new
            {
                items,
                total,
                page = Math.Max(1, page),
                pageSize = 10
            });
        }

        // Stats cards + distributions for the Tracer Study screen.
        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var stats = await _tracerService.GetAdminStatsAsync();
            return Ok(stats);
        }

        // The school deliverable: flat CSV of every response (UTF-8 BOM so
        // Excel renders names correctly). Logs EXPORT_TRACER like other
        // admin exports.
        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpGet("export")]
        public async Task<IActionResult> Export()
        {
            var (csv, _) = await _tracerService.BuildExportCsvAsync(GetAdminId());
            var bytes = Encoding.UTF8.GetBytes(csv);
            return File(bytes, "text/csv; charset=utf-8",
                $"tracer_responses_{DateTime.UtcNow:yyyyMMdd}.csv");
        }
    }
}

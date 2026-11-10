using System.Security.Claims;
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
    }
}

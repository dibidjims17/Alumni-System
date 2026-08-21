using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyApp.Application.Interfaces;
using MyApp.Shared.DTOs;

namespace MyApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class JobsController : ControllerBase
    {
        private readonly IJobService _jobService;

        public JobsController(IJobService jobService)
        {
            _jobService = jobService;
        }

        private int GetUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        private bool IsGraduate() =>
            User.FindFirstValue("SchoolYear") == "Graduate";

        // ─── Alumni endpoints ───────────────────────────────

        [HttpGet]
        public async Task<IActionResult> GetJobs([FromQuery] int page = 1)
        {
            var (items, total) = await _jobService.GetJobsAsync(page, GetUserId());
            return Ok(new { items, total, page, pageSize = 10 });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetJobById(int id)
        {
            var result = await _jobService.GetJobByIdAsync(id, GetUserId());
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPost("{id}/apply")]
        public async Task<IActionResult> Apply(int id, [FromBody] ApplyJobRequest request)
        {
            if (!IsGraduate())
                return Forbid();

            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var (success, message) = await _jobService.ApplyToJobAsync(id, GetUserId(), request, ipAddress);
            if (!success) return BadRequest(new { message });
            return Ok(new { message });
        }

        [HttpGet("my-applications")]
        public async Task<IActionResult> GetMyApplications()
        {
            if (!IsGraduate())
                return Forbid();

            var result = await _jobService.GetMyApplicationsAsync(GetUserId());
            return Ok(result);
        }

        // ─── Admin endpoints ────────────────────────────────

        [HttpPost]
        public async Task<IActionResult> CreateJob([FromBody] CreateJobRequest request)
        {
            var result = await _jobService.CreateJobAsync(request, GetUserId());
            return Ok(result);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateJob(int id, [FromBody] CreateJobRequest request)
        {
            var success = await _jobService.UpdateJobAsync(id, request);
            if (!success) return NotFound();
            return Ok(new { message = "Job updated successfully." });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteJob(int id)
        {
            var success = await _jobService.DeleteJobAsync(id);
            if (!success) return NotFound();
            return Ok(new { message = "Job deleted successfully." });
        }

        [HttpGet("{id}/applicants")]
        public async Task<IActionResult> GetApplicants(int id)
        {
            var result = await _jobService.GetApplicantsAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPut("applications/{applicationId}/status")]
        public async Task<IActionResult> UpdateApplicationStatus(int applicationId, [FromBody] UpdateApplicationStatusRequest request)
        {
            var success = await _jobService.UpdateApplicationStatusAsync(applicationId, request, GetUserId());
            if (!success) return NotFound();
            return Ok(new { message = "Application status updated successfully." });
        }
    }
}
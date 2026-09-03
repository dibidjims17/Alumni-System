using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyApp.Application.Interfaces;
using MyApp.Shared.DTOs;
using System.IO.Compression;
using System.Text;

namespace MyApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class JobsController : ControllerBase
    {
        private readonly IJobService _jobService;
        private readonly IResumeService _resumeService;

        public JobsController(IJobService jobService, IResumeService resumeService)
        {
            _jobService = jobService;
            _resumeService = resumeService;
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

        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpPost]
        public async Task<IActionResult> CreateJob([FromBody] CreateJobRequest request)
        {
            var result = await _jobService.CreateJobAsync(request, GetUserId());
            return Ok(result);
        }

        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateJob(int id, [FromBody] CreateJobRequest request)
        {
            var success = await _jobService.UpdateJobAsync(id, request);
            if (!success) return NotFound();
            return Ok(new { message = "Job updated successfully." });
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteJob(int id)
        {
            var success = await _jobService.SoftDeleteJobAsync(id);
            if (!success) return NotFound();
            return Ok(new { message = "Job moved to trash." });
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("trash")]
        public async Task<IActionResult> GetDeletedJobs()
        {
            var result = await _jobService.GetDeletedJobsAsync();
            return Ok(result);
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpPut("{id}/restore")]
        public async Task<IActionResult> RestoreJob(int id)
        {
            var success = await _jobService.RestoreJobAsync(id);
            if (!success) return NotFound();
            return Ok(new { message = "Job restored successfully." });
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpDelete("{id}/permanent")]
        public async Task<IActionResult> PermanentlyDeleteJob(int id)
        {
            var success = await _jobService.PermanentlyDeleteJobAsync(id);
            if (!success) return NotFound();
            return Ok(new { message = "Job permanently deleted." });
        }

        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpGet("{id}/applicants")]
        public async Task<IActionResult> GetApplicants(int id)
        {
            var result = await _jobService.GetApplicantsAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [Authorize(Roles = "SuperAdmin")]
        [HttpGet("{id}/export")]
        public async Task<IActionResult> ExportApplicants(int id, [FromQuery] string? statuses)
        {
            List<string>? statusList = string.IsNullOrWhiteSpace(statuses)
                ? null
                : statuses.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

            var applicants = await _jobService.GetApplicantsForExportAsync(id, statusList);
            if (applicants == null) return NotFound();

            var job = await _jobService.GetJobByIdAsync(id, GetUserId());
            var jobTitleSafe = job != null
                ? string.Concat(job.JobTitle.Split(Path.GetInvalidFileNameChars()))
                : $"Job{id}";

            using var memoryStream = new MemoryStream();
            using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, true))
            {
                var csv = new StringBuilder();
                csv.AppendLine("StudentNumber,FullName,Email,Program,AppliedAt,Status,AdminNotes,ResumeFileName");

                foreach (var a in applicants)
                {
                    var resumeFileNameForCsv = "";

                    if (a.ResumeId != null)
                    {
                        var resume = await _resumeService.GetResumeByIdAsync(a.ResumeId.Value);
                        if (resume != null && System.IO.File.Exists(resume.FilePath))
                        {
                            var safeName = string.Concat($"{a.StudentNumber}_{a.FullName}".Split(Path.GetInvalidFileNameChars()));
                            resumeFileNameForCsv = $"{safeName}_Resume.pdf";

                            var resumeEntry = archive.CreateEntry($"resumes/{resumeFileNameForCsv}");
                            using var resumeEntryStream = resumeEntry.Open();
                            using var fileStream = System.IO.File.OpenRead(resume.FilePath);
                            await fileStream.CopyToAsync(resumeEntryStream);
                        }
                    }

                    csv.AppendLine(string.Join(",",
                        EscapeCsv(a.StudentNumber),
                        EscapeCsv(a.FullName),
                        EscapeCsv(a.Email),
                        EscapeCsv(a.Program),
                        EscapeCsv(a.AppliedAt.ToString("yyyy-MM-dd HH:mm")),
                        EscapeCsv(a.Status),
                        EscapeCsv(a.AdminNotes ?? ""),
                        EscapeCsv(resumeFileNameForCsv)
                    ));
                }

                var csvEntry = archive.CreateEntry("applicants.csv");
                using (var entryStream = csvEntry.Open())
                using (var writer = new StreamWriter(entryStream, Encoding.UTF8))
                {
                    await writer.WriteAsync(csv.ToString());
                }
            }

            memoryStream.Position = 0;
            var zipFileName = $"{jobTitleSafe}_Applicants_{DateTime.UtcNow:yyyyMMdd}.zip";
            return File(memoryStream.ToArray(), "application/zip", zipFileName);
        }

        private static string EscapeCsv(string field)
        {
            if (field.Contains(',') || field.Contains('"') || field.Contains('\n'))
                return $"\"{field.Replace("\"", "\"\"")}\"";
            return field;
        }

        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpPut("applications/{applicationId}/status")]
        public async Task<IActionResult> UpdateApplicationStatus(int applicationId, [FromBody] UpdateApplicationStatusRequest request)
        {
            var success = await _jobService.UpdateApplicationStatusAsync(applicationId, request, GetUserId());
            if (!success) return NotFound();
            return Ok(new { message = "Application status updated successfully." });
        }

        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpGet("applications/{applicationId}/history")]
        public async Task<IActionResult> GetApplicationHistory(int applicationId)
        {
            var history = await _jobService.GetApplicationHistoryAsync(applicationId);
            if (history == null) return NotFound();
            return Ok(history);
        }

        [Authorize(Roles = "Student")]
        [HttpGet("my-applications/{applicationId}/history")]
        public async Task<IActionResult> GetMyApplicationHistory(int applicationId)
        {
            var history = await _jobService.GetMyApplicationHistoryAsync(applicationId, GetUserId());
            if (history == null) return Forbid();
            return Ok(history);
        }
    }
}
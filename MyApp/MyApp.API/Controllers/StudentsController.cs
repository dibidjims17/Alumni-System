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
    public class StudentsController : ControllerBase
    {
        private readonly IStudentService _studentService;
        private readonly IProfileService _profileService;

        public StudentsController(IStudentService studentService, IProfileService profileService)
        {
            _studentService = studentService;
            _profileService = profileService;
        }

        private int GetUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _studentService.GetAllStudentsAsync();
            return Ok(result);
        }

        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpPost("import")]
        public async Task<IActionResult> Import([FromBody] List<ImportStudentDto> students)
        {
            var result = await _studentService.ImportStudentsAsync(students, GetUserId());
            return Ok(result);
        }

        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpPut("{id}/toggle-status")]
        public async Task<IActionResult> ToggleStatus(int id)
        {
            var success = await _studentService.ToggleStudentStatusAsync(id, GetUserId());
            if (!success) return NotFound();
            return Ok(new { message = "Student status updated." });
        }

        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var (totalStudents, activeStudents, graduateStudents) = await _studentService.GetStatsAsync();
            return Ok(new
            {
                totalStudents,
                activeStudents,
                graduateStudents
            });
        }

        // Full alumni profile (contact, education, work, skills, picture, prefs)
        // for the admin record view. No secrets are returned.
        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpGet("{id}/profile")]
        public async Task<IActionResult> GetStudentProfile(int id)
        {
            var profile = await _profileService.GetProfileAsync(id);
            if (profile == null) return NotFound();
            var jobPreferences = await _profileService.GetJobPreferencesAsync(id);
            return Ok(new { profile, jobPreferences });
        }

        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateStudent(int id, [FromBody] UpdateStudentRequest request)
        {
            var success = await _studentService.UpdateStudentAsync(id, request, GetUserId());
            if (!success) return NotFound();
            return Ok(new { message = "Student record updated." });
        }

        // Issues a one-time temporary password (shown to the admin once).
        // The student must change it on next login.
        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpPost("{id}/reset-password")]
        public async Task<IActionResult> ResetStudentPassword(int id)
        {
            var temporaryPassword = await _studentService.ResetStudentPasswordAsync(id, GetUserId());
            if (temporaryPassword == null) return NotFound();
            return Ok(new { temporaryPassword });
        }     
    }
}
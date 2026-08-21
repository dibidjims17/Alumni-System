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
    public class ProfileController : ControllerBase
    {
        private readonly IProfileService _profileService;

        public ProfileController(IProfileService profileService)
        {
            _profileService = profileService;
        }

        private int GetStudentId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        private bool IsGraduate() =>
            User.FindFirstValue("SchoolYear") == "Graduate";

        [HttpGet]
        public async Task<IActionResult> GetProfile()
        {
            if (!IsGraduate()) return Forbid();
            var result = await _profileService.GetProfileAsync(GetStudentId());
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPut]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            if (!IsGraduate()) return Forbid();
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            await _profileService.UpdateProfileAsync(GetStudentId(), request, ipAddress);
            return Ok(new { message = "Profile updated successfully." });
        }

        [HttpGet("job-preferences")]
        public async Task<IActionResult> GetJobPreferences()
        {
            if (!IsGraduate()) return Forbid();
            var result = await _profileService.GetJobPreferencesAsync(GetStudentId());
            if (result == null) return NotFound(new { message = "No job preferences set yet." });
            return Ok(result);
        }

        [HttpPut("job-preferences")]
        public async Task<IActionResult> UpdateJobPreferences([FromBody] JobPreferenceDto request)
        {
            if (!IsGraduate()) return Forbid();
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            await _profileService.UpdateJobPreferencesAsync(GetStudentId(), request, ipAddress);
            return Ok(new { message = "Job preferences updated successfully." });
        }

        [HttpPost("work-experience")]
        public async Task<IActionResult> AddWorkExperience([FromBody] WorkExperienceDto request)
        {
            if (!IsGraduate()) return Forbid();
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            await _profileService.AddWorkExperienceAsync(GetStudentId(), request, ipAddress);
            return Ok(new { message = "Work experience added successfully." });
        }

        [HttpPut("work-experience/{id}")]
        public async Task<IActionResult> UpdateWorkExperience(int id, [FromBody] WorkExperienceDto request)
        {
            if (!IsGraduate()) return Forbid();
            var success = await _profileService.UpdateWorkExperienceAsync(GetStudentId(), id, request);
            if (!success) return NotFound();
            return Ok(new { message = "Work experience updated successfully." });
        }

        [HttpDelete("work-experience/{id}")]
        public async Task<IActionResult> DeleteWorkExperience(int id)
        {
            if (!IsGraduate()) return Forbid();
            var success = await _profileService.DeleteWorkExperienceAsync(GetStudentId(), id);
            if (!success) return NotFound();
            return Ok(new { message = "Work experience deleted successfully." });
        }

        [HttpPost("education")]
        public async Task<IActionResult> AddEducation([FromBody] EducationDto request)
        {
            if (!IsGraduate()) return Forbid();
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            await _profileService.AddEducationAsync(GetStudentId(), request, ipAddress);
            return Ok(new { message = "Education added successfully." });
        }

        [HttpPut("education/{id}")]
        public async Task<IActionResult> UpdateEducation(int id, [FromBody] EducationDto request)
        {
            if (!IsGraduate()) return Forbid();
            var success = await _profileService.UpdateEducationAsync(GetStudentId(), id, request);
            if (!success) return NotFound();
            return Ok(new { message = "Education updated successfully." });
        }

        [HttpDelete("education/{id}")]
        public async Task<IActionResult> DeleteEducation(int id)
        {
            if (!IsGraduate()) return Forbid();
            var success = await _profileService.DeleteEducationAsync(GetStudentId(), id);
            if (!success) return NotFound();
            return Ok(new { message = "Education deleted successfully." });
        }

        [HttpPut("skills")]
        public async Task<IActionResult> UpdateSkills([FromBody] List<string> skills)
        {
            if (!IsGraduate()) return Forbid();
            await _profileService.UpdateSkillsAsync(GetStudentId(), skills);
            return Ok(new { message = "Skills updated successfully." });
        }
    }
}
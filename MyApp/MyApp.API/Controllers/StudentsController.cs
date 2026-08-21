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

        public StudentsController(IStudentService studentService)
        {
            _studentService = studentService;
        }

        private int GetUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _studentService.GetAllStudentsAsync();
            return Ok(result);
        }

        [HttpPost("import")]
        public async Task<IActionResult> Import([FromBody] List<ImportStudentDto> students)
        {
            var result = await _studentService.ImportStudentsAsync(students, GetUserId());
            return Ok(result);
        }

        [HttpPut("{id}/toggle-status")]
        public async Task<IActionResult> ToggleStatus(int id)
        {
            var success = await _studentService.ToggleStudentStatusAsync(id, GetUserId());
            if (!success) return NotFound();
            return Ok(new { message = "Student status updated." });
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var students = await _studentService.GetAllStudentsAsync();
            return Ok(new
            {
                totalStudents = students.Count,
                activeStudents = students.Count(s => s.IsActive),
                graduateStudents = students.Count(s => s.SchoolYear == "Graduate")
            });
        }     
    }
}
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyApp.Application.Interfaces;

namespace MyApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly IStudentService _studentService;
        private readonly INewsRepository _newsRepository;
        private readonly IJobRepository _jobRepository;

        public DashboardController(
            IStudentService studentService,
            INewsRepository newsRepository,
            IJobRepository jobRepository)
        {
            _studentService = studentService;
            _newsRepository = newsRepository;
            _jobRepository = jobRepository;
        }

        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var students = await _studentService.GetAllStudentsAsync();
            var totalNews = await _newsRepository.GetTotalCountAsync();
            var totalJobs = await _jobRepository.GetActiveCountAsync();

            return Ok(new
            {
                totalStudents = students.Count,
                activeStudents = students.Count(s => s.IsActive),
                graduateStudents = students.Count(s => s.SchoolYear == "Graduate"),
                totalNews,
                totalJobs
            });
        }
    }
}
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
            var (totalStudents, activeStudents, graduateStudents) = await _studentService.GetStatsAsync();
            var totalNews = await _newsRepository.GetTotalCountAsync();
            var totalJobs = await _jobRepository.GetActiveCountAsync();

            return Ok(new
            {
                totalStudents,
                activeStudents,
                graduateStudents,
                totalNews,
                totalJobs
            });
        }
    }
}
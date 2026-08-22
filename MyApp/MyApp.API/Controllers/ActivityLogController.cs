using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyApp.Application.Interfaces;
using MyApp.Shared.DTOs;

namespace MyApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "SuperAdmin")]
    public class ActivityLogController : ControllerBase
    {
        private readonly IActivityLogRepository _activityLogRepository;

        public ActivityLogController(IActivityLogRepository activityLogRepository)
        {
            _activityLogRepository = activityLogRepository;
        }

        [HttpGet]
        public async Task<IActionResult> GetLogs([FromQuery] int page = 1)
        {
            var logs = await _activityLogRepository.GetAllAsync(page, 50);
            var total = await _activityLogRepository.GetTotalCountAsync();

            var items = logs.Select(l => new ActivityLogDto
            {
                Id = l.Id,
                ActorName = l.Student != null ? l.Student.FullName :
                             l.Admin != null ? l.Admin.FullName : "System",
                ActorType = l.Student != null ? "Student" :
                            l.Admin != null ? "Admin" : "System",
                Action = l.Action,
                Details = l.Details,
                IpAddress = l.IpAddress,
                CreatedAt = l.CreatedAt
            }).ToList();

            return Ok(new { items, total, page });
        }
    }
}
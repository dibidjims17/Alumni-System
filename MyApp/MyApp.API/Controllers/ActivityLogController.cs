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
        private readonly IAlumniProfileRepository _alumniProfileRepository;

        public ActivityLogController(
            IActivityLogRepository activityLogRepository,
            IAlumniProfileRepository alumniProfileRepository)
        {
            _activityLogRepository = activityLogRepository;
            _alumniProfileRepository = alumniProfileRepository;
        }

        [HttpGet]
        public async Task<IActionResult> GetLogs([FromQuery] int page = 1)
        {
            var logs = await _activityLogRepository.GetAllAsync(page, 50);
            var total = await _activityLogRepository.GetTotalCountAsync();

            // One batched lookup for student profile pictures on this page.
            var studentIds = logs
                .Where(l => l.Student != null)
                .Select(l => l.StudentId!.Value)
                .Distinct()
                .ToList();
            var profiles = studentIds.Count > 0
                ? await _alumniProfileRepository.GetByStudentIdsAsync(studentIds)
                : new Dictionary<int, MyApp.Domain.Entities.AlumniProfile>();

            var items = logs.Select(l => new ActivityLogDto
            {
                Id = l.Id,
                ActorName = l.Student != null ? l.Student.FullName :
                             l.Admin != null ? l.Admin.FullName : "System",
                ActorType = l.Student != null ? "Student" :
                            l.Admin != null ? "Admin" : "System",
                ActorPicturePath = l.Admin != null ? l.Admin.ProfilePicturePath :
                    (l.Student != null && profiles.TryGetValue(l.Student.Id, out var profile)
                        ? profile.ProfilePicturePath : null),
                Action = l.Action,
                Details = l.Details,
                IpAddress = l.IpAddress,
                CreatedAt = l.CreatedAt
            }).ToList();

            return Ok(new { items, total, page });
        }
    }
}
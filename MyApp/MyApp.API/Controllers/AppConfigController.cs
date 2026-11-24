using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MyApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AppConfigController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public AppConfigController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpGet]
        public IActionResult Get()
        {
            return Ok(new
            {
                pilotTour = new
                {
                    enabled = _configuration.GetValue<bool>("PilotTour:Enabled"),
                    version = _configuration["PilotTour:Version"] ?? "pilot-tour-v1",
                    feedbackFormUrl = _configuration["PilotTour:FeedbackFormUrl"] ?? string.Empty
                }
            });
        }
    }
}

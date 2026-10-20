using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyApp.Application.Interfaces;

namespace MyApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SuggestionsController : ControllerBase
    {
        private readonly ISuggestionsService _suggestionsService;

        public SuggestionsController(ISuggestionsService suggestionsService)
        {
            _suggestionsService = suggestionsService;
        }

        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] string? term,
            [FromQuery] string? type)
        {
            var suggestions = await _suggestionsService.GetSuggestionsAsync(term, type);
            return Ok(suggestions);
        }
    }
}

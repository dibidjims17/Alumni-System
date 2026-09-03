using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyApp.Application.Interfaces;

namespace MyApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Student")]
    public class DirectoryController : ControllerBase
    {
        private readonly IDirectoryService _directoryService;
        private const int PageSize = 20;

        public DirectoryController(IDirectoryService directoryService)
        {
            _directoryService = directoryService;
        }

        // Private alumni directory: only opted-in, active graduates, public fields only.
        [HttpGet]
        public async Task<IActionResult> Search(
            [FromQuery] string? search,
            [FromQuery] string? program,
            [FromQuery] string? schoolYear,
            [FromQuery] int page = 1)
        {
            var (items, total) = await _directoryService.SearchAsync(
                search, program, schoolYear, page, PageSize);
            return Ok(new { items, total, page, pageSize = PageSize });
        }

        [HttpGet("filters")]
        public async Task<IActionResult> GetFilters()
        {
            var filters = await _directoryService.GetFiltersAsync();
            return Ok(filters);
        }
    }
}

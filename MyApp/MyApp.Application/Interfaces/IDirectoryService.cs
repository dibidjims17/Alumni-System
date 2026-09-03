using MyApp.Shared.DTOs;

namespace MyApp.Application.Interfaces
{
    public interface IDirectoryService
    {
        Task<(List<AlumniDirectoryDto> Items, int TotalCount)> SearchAsync(
            string? search, string? program, string? schoolYear, int page, int pageSize);
        Task<DirectoryFiltersDto> GetFiltersAsync();
    }
}

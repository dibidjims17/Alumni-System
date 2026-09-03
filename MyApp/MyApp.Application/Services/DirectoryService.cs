using MyApp.Application.Interfaces;
using MyApp.Shared.DTOs;

namespace MyApp.Application.Services
{
    public class DirectoryService : IDirectoryService
    {
        private readonly IStudentRepository _studentRepository;
        private readonly IAlumniProfileRepository _profileRepository;

        public DirectoryService(
            IStudentRepository studentRepository,
            IAlumniProfileRepository profileRepository)
        {
            _studentRepository = studentRepository;
            _profileRepository = profileRepository;
        }

        public async Task<(List<AlumniDirectoryDto> Items, int TotalCount)> SearchAsync(
            string? search, string? program, string? schoolYear, int page, int pageSize)
        {
            var (students, total) = await _studentRepository.SearchDirectoryAsync(
                search, program, schoolYear, page, pageSize);

            var profiles = await _profileRepository.GetByStudentIdsAsync(
                students.Select(s => s.Id));

            var items = students.Select(s =>
            {
                profiles.TryGetValue(s.Id, out var profile);
                return new AlumniDirectoryDto
                {
                    FullName = s.FullName,
                    Program = s.Program,
                    SchoolYear = s.SchoolYear,
                    Headline = profile?.Headline ?? string.Empty,
                    Location = profile?.Location ?? string.Empty
                };
            }).ToList();

            return (items, total);
        }

        public async Task<DirectoryFiltersDto> GetFiltersAsync()
        {
            var (programs, schoolYears) = await _studentRepository.GetDirectoryFilterValuesAsync();
            return new DirectoryFiltersDto
            {
                Programs = programs,
                SchoolYears = schoolYears
            };
        }
    }
}

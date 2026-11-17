using System.Collections.Generic;
using System.Threading.Tasks;
using MyApp.Application.Interfaces;

namespace MyApp.Application.Services
{
    public class SuggestionsService : ISuggestionsService
    {
        private readonly IAlumniProfileRepository _profileRepository;
        private readonly ISkillRepository _skillRepository;
        private readonly IJobPreferenceRepository _jobPreferenceRepository;
        private readonly IStudentRepository _studentRepository;

        public SuggestionsService(
            IAlumniProfileRepository profileRepository,
            ISkillRepository skillRepository,
            IJobPreferenceRepository jobPreferenceRepository,
            IStudentRepository studentRepository)
        {
            _profileRepository = profileRepository;
            _skillRepository = skillRepository;
            _jobPreferenceRepository = jobPreferenceRepository;
            _studentRepository = studentRepository;
        }

        public async Task<List<string>> GetSuggestionsAsync(string? term, string? type)
        {
            if (string.IsNullOrWhiteSpace(term))
                return new List<string>();

            var search = term.Trim();

            return type switch
            {
                "location" => await _profileRepository.GetLocationSuggestionsAsync(search),
                "skill" => await _skillRepository.GetSkillSuggestionsAsync(search),
                "jobtitle" => await _jobPreferenceRepository.GetJobTitleSuggestionsAsync(search),
                "industry" => await _jobPreferenceRepository.GetIndustrySuggestionsAsync(search),
                "program" => await GetProgramSuggestionsAsync(search),
                _ => new List<string>()
            };
        }

        private async Task<List<string>> GetProgramSuggestionsAsync(string search)
        {
            var storedPrograms = await _studentRepository.GetProgramSuggestionsAsync(search);

            // Catalog matches come first so an abbreviation such as BSIT
            // always recommends one full, uniform value. Unknown programs in
            // the database still remain discoverable for future offerings.
            return ProgramCatalog.Search(search)
                .Concat(storedPrograms.Select(ProgramCatalog.Canonicalize))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Take(10)
                .ToList();
        }
    }
}

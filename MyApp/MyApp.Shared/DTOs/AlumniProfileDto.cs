namespace MyApp.Shared.DTOs
{
    public class AlumniProfileDto
    {
        public string FullName { get; set; } = string.Empty;
        public string StudentNumber { get; set; } = string.Empty;
        public string Program { get; set; } = string.Empty;
        public string SchoolYear { get; set; } = string.Empty;
        public string Headline { get; set; } = string.Empty;
        public string Bio { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string LinkedInUrl { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public DateTime? DateOfBirth { get; set; }
        public string Address { get; set; } = string.Empty;
        public List<WorkExperienceDto> WorkExperiences { get; set; } = new();
        public List<EducationDto> Educations { get; set; } = new();
        public List<string> Skills { get; set; } = new();
    }
}
namespace MyApp.Shared.DTOs
{
    public class JobPreferenceDto
    {
        public string PreferredJobTitle { get; set; } = string.Empty;
        public string PreferredIndustry { get; set; } = string.Empty;
        public string PreferredLocation { get; set; } = string.Empty;
        public bool IsOpenToWork { get; set; }
    }
}
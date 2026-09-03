namespace MyApp.Shared.DTOs
{
    // Public card shown in the private alumni directory.
    // Never includes contact info (email, phone) or student numbers.
    public class AlumniDirectoryDto
    {
        public string FullName { get; set; } = string.Empty;
        public string Program { get; set; } = string.Empty;
        public string SchoolYear { get; set; } = string.Empty;
        public string Headline { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
    }
}

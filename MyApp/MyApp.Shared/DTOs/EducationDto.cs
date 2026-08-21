namespace MyApp.Shared.DTOs
{
    public class EducationDto
    {
        public int Id { get; set; }
        public string Degree { get; set; } = string.Empty;
        public string FieldOfStudy { get; set; } = string.Empty;
        public string School { get; set; } = string.Empty;
        public int StartYear { get; set; }
        public int? EndYear { get; set; }
        public bool IsCurrentlyStudying => EndYear == null;
    }
}
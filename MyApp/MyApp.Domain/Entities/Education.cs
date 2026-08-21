namespace MyApp.Domain.Entities
{
    public class Education
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string Degree { get; set; } = string.Empty;
        public string FieldOfStudy { get; set; } = string.Empty;
        public string School { get; set; } = string.Empty;
        public int StartYear { get; set; }
        public int? EndYear { get; set; }    // null = currently studying

        public Student Student { get; set; } = null!;
    }
}
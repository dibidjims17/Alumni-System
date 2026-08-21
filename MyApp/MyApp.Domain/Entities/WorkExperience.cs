namespace MyApp.Domain.Entities
{
    public class WorkExperience
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string JobTitle { get; set; } = string.Empty;
        public string Company { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }    // null = currently working
        public string Description { get; set; } = string.Empty;

        public Student Student { get; set; } = null!;
    }
}
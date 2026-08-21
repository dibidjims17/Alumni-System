namespace MyApp.Domain.Entities
{
    public class JobPreference
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string PreferredJobTitle { get; set; } = string.Empty;
        public string PreferredIndustry { get; set; } = string.Empty;
        public string PreferredLocation { get; set; } = string.Empty;
        public bool IsOpenToWork { get; set; } = false;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public Student Student { get; set; } = null!;
    }
}
namespace MyApp.Domain.Entities
{
    public class JobApplication
    {
        public int Id { get; set; }
        public int JobId { get; set; }
        public int StudentId { get; set; }
        public int? ResumeId { get; set; }
        public bool AttachResume { get; set; }
        public DateTime AppliedAt { get; set; } = DateTime.UtcNow;
        public string Status { get; set; } = "Pending"; // Pending, Reviewed, Shortlisted, Rejected
        public string AdminNotes { get; set; } = string.Empty;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public Job Job { get; set; } = null!;
        public Student Student { get; set; } = null!;
        public Resume? Resume { get; set; }
    }
}
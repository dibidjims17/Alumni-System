namespace MyApp.Domain.Entities
{
    public class Resume
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string FilePath { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
        public bool IsActive { get; set; } = true; // current resume

        public Student Student { get; set; } = null!;
    }
}
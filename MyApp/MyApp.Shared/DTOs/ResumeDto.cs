namespace MyApp.Shared.DTOs
{
    public class ResumeDto
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string FileName { get; set; } = string.Empty;
        public string FilePath { get; set; } = string.Empty;
        public DateTime UploadedAt { get; set; }
        public bool IsActive { get; set; }
    }
}
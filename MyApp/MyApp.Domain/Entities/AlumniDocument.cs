namespace MyApp.Domain.Entities
{
    public class AlumniDocument
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string DocumentType { get; set; } = string.Empty;
        public string? CustomLabel { get; set; }
        public string Status { get; set; } = "Pending";
        public string? Notes { get; set; }
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public int? UpdatedByAdminId { get; set; }

        public Student Student { get; set; } = null!;
        public Admin? UpdatedByAdmin { get; set; }
    }
}
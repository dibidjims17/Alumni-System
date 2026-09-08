namespace MyApp.Domain.Entities
{
    public class YearLevelChangeRequest
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string CurrentSchoolYear { get; set; } = string.Empty;
        public string RequestedSchoolYear { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending"; // Pending | Approved | Declined
        public int? ReviewedByAdminId { get; set; }
        public string? ReviewNote { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ReviewedAt { get; set; }

        public Student Student { get; set; } = null!;
        public Admin? ReviewedByAdmin { get; set; }
    }
}

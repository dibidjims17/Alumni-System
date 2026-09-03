namespace MyApp.Domain.Entities
{
    public class JobApplicationHistory
    {
        public int Id { get; set; }
        public int JobApplicationId { get; set; }
        public string FromStatus { get; set; } = string.Empty;
        public string ToStatus { get; set; } = string.Empty;
        public string AdminNotes { get; set; } = string.Empty;
        public int? UpdatedByAdminId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public JobApplication JobApplication { get; set; } = null!;
        public Admin? UpdatedByAdmin { get; set; }
    }
}

namespace MyApp.Shared.DTOs
{
    public class JobApplicationHistoryDto
    {
        public int Id { get; set; }
        public int JobApplicationId { get; set; }
        public string FromStatus { get; set; } = string.Empty;
        public string ToStatus { get; set; } = string.Empty;
        public string AdminNotes { get; set; } = string.Empty;
        public string UpdatedByAdminName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}

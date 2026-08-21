namespace MyApp.Domain.Entities
{
    public class Notification
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty; // "APPLICATION_STATUS", "NEWS", "GENERAL"
        public int? RelatedId { get; set; }              // e.g. JobApplicationId or NewsId
        public bool IsRead { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Student Student { get; set; } = null!;
    }
}
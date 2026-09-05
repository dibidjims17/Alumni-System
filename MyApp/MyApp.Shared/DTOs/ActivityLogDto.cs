namespace MyApp.Shared.DTOs
{
    public class ActivityLogDto
    {
        public int Id { get; set; }
        public string ActorName { get; set; } = string.Empty;
        public string ActorType { get; set; } = string.Empty; // "Student" or "Admin"
        public string? ActorPicturePath { get; set; }
        public string Action { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty;
        public string IpAddress { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
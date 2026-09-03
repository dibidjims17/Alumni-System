namespace MyApp.Shared.DTOs
{
    public class EventDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public DateTime EventDate { get; set; }
        public string PostedByAdminName { get; set; } = string.Empty;
        public int AttendeeCount { get; set; }
        public bool IsRsvped { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}

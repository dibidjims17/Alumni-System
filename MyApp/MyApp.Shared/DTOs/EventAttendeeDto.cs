namespace MyApp.Shared.DTOs
{
    public class EventAttendeeDto
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string StudentNumber { get; set; } = string.Empty;
        public string Program { get; set; } = string.Empty;
        public string SchoolYear { get; set; } = string.Empty;
        public DateTime RsvpedAt { get; set; }
    }
}

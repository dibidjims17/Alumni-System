namespace MyApp.Domain.Entities
{
    public class ActivityLog
    {
        public int Id { get; set; }
        public int? StudentId { get; set; }
        public int? AdminId { get; set; }
        public string Action { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty;
        public string IpAddress { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Student? Student { get; set; }
        public Admin? Admin { get; set; }
    }
}
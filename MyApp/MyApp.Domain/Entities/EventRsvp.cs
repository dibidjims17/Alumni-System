namespace MyApp.Domain.Entities
{
    public class EventRsvp
    {
        public int Id { get; set; }
        public int EventId { get; set; }
        public int StudentId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Event Event { get; set; } = null!;
        public Student Student { get; set; } = null!;
    }
}

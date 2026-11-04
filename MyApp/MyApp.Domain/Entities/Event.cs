namespace MyApp.Domain.Entities
{
    public class Event
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public DateTime EventDate { get; set; }

        // Optional flyer, stored as a relative path (Uploads/Events/<file>).
        public string? ImagePath { get; set; }

        // Publishing intent is separate from EventDate (the time the event
        // itself happens). A future PublishAt keeps an otherwise-published
        // event hidden until the scheduler promotes it.
        public bool IsPublished { get; set; } = true;
        public DateTime? PublishAt { get; set; }

        public int PostedByAdminId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public bool IsDeleted { get; set; } = false;

        public Admin PostedByAdmin { get; set; } = null!;
        public ICollection<EventRsvp> Rsvps { get; set; } = new List<EventRsvp>();
    }
}

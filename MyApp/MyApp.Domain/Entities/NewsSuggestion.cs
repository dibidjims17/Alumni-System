namespace MyApp.Domain.Entities
{
    // A user-submitted post suggestion: endorse a business, look for
    // clients, or share a community announcement. Anyone signed in can
    // submit; an admin (SuperAdmin/Staff) reviews it. Approval publishes
    // the suggestion to the Community feed as a News post (NewsId link);
    // rejection records the reason for the submitter's status list.
    public class NewsSuggestion
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;

        // Relative path under Uploads/News/, served as a static file.
        public string? ImagePath { get; set; }

        // Pending | Approved | Rejected
        public string Status { get; set; } = "Pending";
        public string? ReviewNote { get; set; }
        public int? ReviewedByAdminId { get; set; }
        public DateTime? ReviewedAt { get; set; }

        // Set on approval: the News post this suggestion became.
        public int? NewsId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public Student Student { get; set; } = null!;
        public Admin? ReviewedByAdmin { get; set; }
        public News? News { get; set; }
    }
}

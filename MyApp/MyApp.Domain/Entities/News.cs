namespace MyApp.Domain.Entities
{
    public class News
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? ImagePath { get; set; }
        public int PostedByAdminId { get; set; }
        public DateTime PostedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public bool IsPublished { get; set; } = true;

        // Scheduled publishing: when set (and still in the future) the post
        // stays invisible to students until that moment. A due PublishAt is
        // normalised to null on save, so a non-null value always means
        // "still waiting" — see NewsService.PublishDueNewsAsync.
        public DateTime? PublishAt { get; set; }

        public bool IsDeleted { get; set; } = false;

        public Admin PostedByAdmin { get; set; } = null!;
        public ICollection<NewsComment> Comments { get; set; } = new List<NewsComment>();
        public ICollection<NewsHeart> Hearts { get; set; } = new List<NewsHeart>();
    }
}
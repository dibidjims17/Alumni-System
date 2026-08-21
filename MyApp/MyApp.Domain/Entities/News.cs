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

        public Admin PostedByAdmin { get; set; } = null!;
        public ICollection<NewsComment> Comments { get; set; } = new List<NewsComment>();
        public ICollection<NewsHeart> Hearts { get; set; } = new List<NewsHeart>();
    }
}
namespace MyApp.Domain.Entities
{
    public class NewsHeart
    {
        public int Id { get; set; }
        public int NewsId { get; set; }
        public int StudentId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public News News { get; set; } = null!;
        public Student Student { get; set; } = null!;
    }
}
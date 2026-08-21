namespace MyApp.Domain.Entities
{
    public class NewsCommentLike
    {
        public int Id { get; set; }
        public int CommentId { get; set; }
        public int StudentId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public NewsComment Comment { get; set; } = null!;
        public Student Student { get; set; } = null!;
    }
}
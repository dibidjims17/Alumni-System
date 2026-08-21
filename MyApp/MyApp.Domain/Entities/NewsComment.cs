namespace MyApp.Domain.Entities
{
    public class NewsComment
    {
        public int Id { get; set; }
        public int NewsId { get; set; }
        public int StudentId { get; set; }
        public int? ParentCommentId { get; set; }
        public int? MentionedStudentId { get; set; }
        public string Comment { get; set; } = string.Empty;
        public DateTime CommentedAt { get; set; } = DateTime.UtcNow;
        public bool IsDeleted { get; set; } = false;

        public News News { get; set; } = null!;
        public Student Student { get; set; } = null!;
        public NewsComment? ParentComment { get; set; }
        public Student? MentionedStudent { get; set; }
        public ICollection<NewsComment> Replies { get; set; } = new List<NewsComment>();
        public ICollection<NewsCommentLike> Likes { get; set; } = new List<NewsCommentLike>();
    }
}
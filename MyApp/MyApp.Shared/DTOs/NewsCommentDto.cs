namespace MyApp.Shared.DTOs
{
    public class NewsCommentDto
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string? StudentPicturePath { get; set; }
        public string Comment { get; set; } = string.Empty;
        public DateTime CommentedAt { get; set; }
        public int LikeCount { get; set; }
        public bool IsLiked { get; set; }
        public int? ParentCommentId { get; set; }
        public string? MentionedStudentName { get; set; }
        public List<NewsCommentDto> Replies { get; set; } = new();
    }
}
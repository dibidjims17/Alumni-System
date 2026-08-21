namespace MyApp.Shared.DTOs
{
    public class AddCommentRequest
    {
        public string Comment { get; set; } = string.Empty;
        public int? ParentCommentId { get; set; }
        public int? MentionedStudentId { get; set; }
    }
}
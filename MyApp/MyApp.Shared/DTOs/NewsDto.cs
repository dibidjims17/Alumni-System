namespace MyApp.Shared.DTOs
{
    public class NewsDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? ImagePath { get; set; }
        public string PostedByAdminName { get; set; } = string.Empty;
        public string? PostedByAdminPicture { get; set; }
        public DateTime PostedAt { get; set; }
        public int HeartCount { get; set; }
        public bool IsHearted { get; set; }
        public int CommentCount { get; set; }
    }
}
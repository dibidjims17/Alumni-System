namespace MyApp.Shared.DTOs
{
    // POST /api/NewsSuggestion — multipart form (title, content, image?).
    public class SubmitSuggestionRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
    }

    // PUT /api/NewsSuggestion/{id}/review
    public class SuggestionReviewRequest
    {
        // "Approved" | "Rejected" (Pending is not a review outcome)
        public string Status { get; set; } = string.Empty;
        public string? ReviewNote { get; set; }
    }

    // GET /api/NewsSuggestion/my — the submitter's own list.
    public class NewsSuggestionMyDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? ImagePath { get; set; }
        public string Status { get; set; } = "Pending";
        public string? ReviewNote { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public int? NewsId { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // GET /api/NewsSuggestion — admin review queue.
    public class NewsSuggestionRowDto
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string StudentNumber { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string? ImagePath { get; set; }
        public string Status { get; set; } = "Pending";
        public string? ReviewNote { get; set; }
        public string? ReviewedByName { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public int? NewsId { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}

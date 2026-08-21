namespace MyApp.Shared.DTOs
{
    public class CreateNewsRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public bool IsPublished { get; set; } = true;
    }
}
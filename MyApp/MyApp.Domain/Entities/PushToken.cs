namespace MyApp.Domain.Entities
{
    public class PushToken
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string Token { get; set; } = string.Empty;
        public string Platform { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public Student Student { get; set; } = null!;
    }
}

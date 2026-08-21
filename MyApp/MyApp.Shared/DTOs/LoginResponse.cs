namespace MyApp.Shared.DTOs
{
    public class LoginResponse
    {
        public int Id { get; set; }
        public string Token { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string StudentNumber { get; set; } = string.Empty;
        public string Program { get; set; } = string.Empty;
        public string SchoolYear { get; set; } = string.Empty;
        public bool MustChangePassword { get; set; }
    }
}
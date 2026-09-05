namespace MyApp.Shared.DTOs
{
    public class AdminLoginResponse
    {
        public string Token { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string? ProfilePicturePath { get; set; }
    }
}
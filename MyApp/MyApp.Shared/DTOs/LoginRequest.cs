namespace MyApp.Shared.DTOs
{
    public class LoginRequest
    {
        public string StudentNumber { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
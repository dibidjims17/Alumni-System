namespace MyApp.Shared.DTOs
{
    public class ResetPasswordRequest
    {
        public string Identifier { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}
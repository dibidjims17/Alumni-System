namespace MyApp.Shared.DTOs
{
    public class ForgotPasswordRequest
    {
        public string Identifier { get; set; } = string.Empty; // student number or email
    }
}
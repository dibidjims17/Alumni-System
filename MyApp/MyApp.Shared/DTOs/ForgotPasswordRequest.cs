using System.ComponentModel.DataAnnotations;

namespace MyApp.Shared.DTOs
{
    public class ForgotPasswordRequest
    {
        [Required(AllowEmptyStrings = false)]
        public string Identifier { get; set; } = string.Empty; // student number or email
    }
}

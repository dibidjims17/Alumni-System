using System.ComponentModel.DataAnnotations;

namespace MyApp.Shared.DTOs
{
    public class LoginRequest
    {
        [Required(AllowEmptyStrings = false)]
        public string Identifier { get; set; } = string.Empty;

        [Required(AllowEmptyStrings = false)]
        public string Password { get; set; } = string.Empty;
    }
}

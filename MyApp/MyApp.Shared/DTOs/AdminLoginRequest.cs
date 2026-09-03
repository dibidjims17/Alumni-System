using System.ComponentModel.DataAnnotations;

namespace MyApp.Shared.DTOs
{
    public class AdminLoginRequest
    {
        [Required(AllowEmptyStrings = false)]
        public string Username { get; set; } = string.Empty;

        [Required(AllowEmptyStrings = false)]
        public string Password { get; set; } = string.Empty;
    }
}

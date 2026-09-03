using System.ComponentModel.DataAnnotations;

namespace MyApp.Shared.DTOs
{
    public class RegisterPushTokenRequest
    {
        [Required(AllowEmptyStrings = false)]
        public string Token { get; set; } = string.Empty;

        public string Platform { get; set; } = string.Empty;
    }
}

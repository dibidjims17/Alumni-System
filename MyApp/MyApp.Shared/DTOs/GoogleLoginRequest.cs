using System.ComponentModel.DataAnnotations;

namespace MyApp.Shared.DTOs
{
    public class GoogleLoginRequest
    {
        [Required(AllowEmptyStrings = false)]
        public string IdToken { get; set; } = string.Empty;
    }
}

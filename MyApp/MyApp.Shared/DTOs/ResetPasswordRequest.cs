using System.ComponentModel.DataAnnotations;

namespace MyApp.Shared.DTOs
{
    public class ResetPasswordRequest
    {
        [Required(AllowEmptyStrings = false)]
        public string Identifier { get; set; } = string.Empty;

        [Required(AllowEmptyStrings = false)]
        public string Code { get; set; } = string.Empty;

        [Required(AllowEmptyStrings = false)]
        public string NewPassword { get; set; } = string.Empty;
    }
}

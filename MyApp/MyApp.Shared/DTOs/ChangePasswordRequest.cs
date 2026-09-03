using System.ComponentModel.DataAnnotations;

namespace MyApp.Shared.DTOs
{
    public class ChangePasswordRequest
    {
        [Required(AllowEmptyStrings = false)]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required(AllowEmptyStrings = false)]
        public string NewPassword { get; set; } = string.Empty;
    }
}

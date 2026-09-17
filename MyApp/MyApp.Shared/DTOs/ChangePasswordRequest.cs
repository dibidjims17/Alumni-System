using System.ComponentModel.DataAnnotations;

namespace MyApp.Shared.DTOs
{
    public class ChangePasswordRequest
    {
        // Empty when the account is in forced-change mode (temporary
        // password login) — the service verifies it only otherwise.
        [Required]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required(AllowEmptyStrings = false)]
        public string NewPassword { get; set; } = string.Empty;
    }
}

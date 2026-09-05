using System.ComponentModel.DataAnnotations;

namespace MyApp.Shared.DTOs
{
    public class UpdateAdminProfileRequest
    {
        [Required(AllowEmptyStrings = false)]
        public string FullName { get; set; } = string.Empty;

        [Required(AllowEmptyStrings = false)]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
    }
}

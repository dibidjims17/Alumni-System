using System.ComponentModel.DataAnnotations;

namespace MyApp.Shared.DTOs
{
    public class CreateAdminRequest
    {
        [Required(AllowEmptyStrings = false)]
        public string Username { get; set; } = string.Empty;

        [Required(AllowEmptyStrings = false)]
        public string FullName { get; set; } = string.Empty;

        [Required(AllowEmptyStrings = false)]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required(AllowEmptyStrings = false)]
        public string Password { get; set; } = string.Empty;

        public string Role { get; set; } = "Staff"; // "SuperAdmin" or "Staff"
    }
}

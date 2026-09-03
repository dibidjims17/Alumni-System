using System.ComponentModel.DataAnnotations;

namespace MyApp.Shared.DTOs
{
    public class UpdateStudentRequest
    {
        [Required(AllowEmptyStrings = false)]
        public string FullName { get; set; } = string.Empty;

        [Required(AllowEmptyStrings = false)]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required(AllowEmptyStrings = false)]
        public string Program { get; set; } = string.Empty;

        [Required(AllowEmptyStrings = false)]
        public string SchoolYear { get; set; } = string.Empty;
    }
}

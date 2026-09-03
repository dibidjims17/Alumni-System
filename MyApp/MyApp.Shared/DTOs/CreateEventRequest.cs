using System.ComponentModel.DataAnnotations;

namespace MyApp.Shared.DTOs
{
    public class CreateEventRequest
    {
        [Required(AllowEmptyStrings = false)]
        public string Title { get; set; } = string.Empty;

        [Required(AllowEmptyStrings = false)]
        public string Description { get; set; } = string.Empty;

        [Required(AllowEmptyStrings = false)]
        public string Location { get; set; } = string.Empty;

        [Required]
        public DateTime? EventDate { get; set; }
    }
}

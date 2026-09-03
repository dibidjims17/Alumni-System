using System.ComponentModel.DataAnnotations;

namespace MyApp.Shared.DTOs
{
    public class CreateNewsRequest
    {
        [Required(AllowEmptyStrings = false)]
        public string Title { get; set; } = string.Empty;

        [Required(AllowEmptyStrings = false)]
        public string Content { get; set; } = string.Empty;

        public bool IsPublished { get; set; } = true;
    }
}

using System.ComponentModel.DataAnnotations;

namespace MyApp.Shared.DTOs
{
    public class AddCommentRequest
    {
        [Required(AllowEmptyStrings = false)]
        public string Comment { get; set; } = string.Empty;

        public int? ParentCommentId { get; set; }
        public int? MentionedStudentId { get; set; }
    }
}

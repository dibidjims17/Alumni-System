using System.ComponentModel.DataAnnotations;

namespace MyApp.Shared.DTOs
{
    public class CreateYearChangeRequest
    {
        [Required(AllowEmptyStrings = false)]
        public string RequestedSchoolYear { get; set; } = string.Empty;

        [Required(AllowEmptyStrings = false)]
        public string Reason { get; set; } = string.Empty;
    }

    public class ReviewYearChangeRequest
    {
        public bool Approve { get; set; }
        public string? Note { get; set; }
    }

    public class YearChangeRequestDto
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string StudentNumber { get; set; } = string.Empty;
        public string CurrentSchoolYear { get; set; } = string.Empty;
        public string RequestedSchoolYear { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? ReviewedByAdminName { get; set; }
        public string? ReviewNote { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }
    }
}

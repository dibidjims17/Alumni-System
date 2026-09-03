using System.ComponentModel.DataAnnotations;

namespace MyApp.Shared.DTOs
{
    public class CreateJobRequest
    {
        [Required(AllowEmptyStrings = false)]
        public string JobTitle { get; set; } = string.Empty;

        [Required(AllowEmptyStrings = false)]
        public string Company { get; set; } = string.Empty;

        public string Location { get; set; } = string.Empty;
        public string Industry { get; set; } = string.Empty;

        [Required(AllowEmptyStrings = false)]
        public string EmploymentType { get; set; } = string.Empty;

        public decimal? SalaryMin { get; set; }
        public decimal? SalaryMax { get; set; }

        [Required(AllowEmptyStrings = false)]
        public string Description { get; set; } = string.Empty;

        public DateTime? Deadline { get; set; }
        public bool IsActive { get; set; } = true;
    }
}

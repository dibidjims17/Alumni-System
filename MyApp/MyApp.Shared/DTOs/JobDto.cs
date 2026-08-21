namespace MyApp.Shared.DTOs
{
    public class JobDto
    {
        public int Id { get; set; }
        public string JobTitle { get; set; } = string.Empty;
        public string Company { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string Industry { get; set; } = string.Empty;
        public string EmploymentType { get; set; } = string.Empty;
        public decimal? SalaryMin { get; set; }
        public decimal? SalaryMax { get; set; }
        public string Description { get; set; } = string.Empty;
        public DateTime PostedAt { get; set; }
        public DateTime? Deadline { get; set; }
        public bool IsActive { get; set; }
        public int ApplicantCount { get; set; }
        public bool HasApplied { get; set; }
    }
}
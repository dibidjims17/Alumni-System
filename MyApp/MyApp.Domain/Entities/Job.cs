namespace MyApp.Domain.Entities
{
    public class Job
    {
        public int Id { get; set; }
        public string JobTitle { get; set; } = string.Empty;
        public string Company { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string Industry { get; set; } = string.Empty;
        public string EmploymentType { get; set; } = string.Empty; // Full-time, Part-time, Contract
        public decimal? SalaryMin { get; set; }
        public decimal? SalaryMax { get; set; }
        public string Description { get; set; } = string.Empty;
        public int PostedByAdminId { get; set; }
        public DateTime PostedAt { get; set; } = DateTime.UtcNow;
        public DateTime? Deadline { get; set; }
        public bool IsActive { get; set; } = true;
        public bool IsDeleted { get; set; } = false;

        public Admin PostedByAdmin { get; set; } = null!;
        public ICollection<JobApplication> Applications { get; set; } = new List<JobApplication>();
    }
}
namespace MyApp.Shared.DTOs
{
    public class StudentDto
    {
        public int Id { get; set; }
        public string StudentNumber { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Program { get; set; } = string.Empty;
        public string SchoolYear { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? ProfilePicturePath { get; set; }
        // Populated only on creation responses so the admin can relay it.
        public string? TemporaryPassword { get; set; }
        public bool InviteEmailSent { get; set; }
    }
}
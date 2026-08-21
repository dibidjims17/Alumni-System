namespace MyApp.Shared.DTOs
{
    public class UpdateApplicationStatusRequest
    {
        public string Status { get; set; } = string.Empty; // Pending, Reviewed, Shortlisted, Rejected
        public string AdminNotes { get; set; } = string.Empty;
    }
}
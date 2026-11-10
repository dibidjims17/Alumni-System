namespace MyApp.Shared.DTOs
{
    public class LoginResponse
    {
        public int Id { get; set; }
        public string Token { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string StudentNumber { get; set; } = string.Empty;
        public string Program { get; set; } = string.Empty;
        public string SchoolYear { get; set; } = string.Empty;
        public bool MustChangePassword { get; set; }

        // Tracer Study pre-screening: false locks the mobile app behind the
        // questionnaire until it is submitted (graduates only — always true
        // for current students, who are not respondents).
        public bool TracerCompleted { get; set; }
        public bool TemporaryPasswordExpired { get; set; }
    }
}
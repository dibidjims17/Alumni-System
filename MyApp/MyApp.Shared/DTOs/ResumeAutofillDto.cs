namespace MyApp.Shared.DTOs
{
    public class ResumeAutofillDto
    {
        public ResumeDto Resume { get; set; } = new();
        public int WorkAdded { get; set; }
        public int EducationAdded { get; set; }
        public int SkillsAdded { get; set; }
        public bool PhoneSet { get; set; }
    }
}

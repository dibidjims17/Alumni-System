namespace MyApp.Domain.Entities
{
    public class Skill
    {
        public int Id { get; set; }
        public int StudentId { get; set; }
        public string SkillName { get; set; } = string.Empty;

        public Student Student { get; set; } = null!;
    }
}
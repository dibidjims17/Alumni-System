namespace MyApp.Shared.DTOs
{
    public class ImportResultDto
    {
        public int Imported { get; set; }
        public int Skipped { get; set; }
        public int Errors { get; set; }
        public List<string> ErrorMessages { get; set; } = new();
    }
}
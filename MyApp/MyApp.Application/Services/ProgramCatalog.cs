namespace MyApp.Application.Services
{
    // Canonical program names used by questionnaire suggestions and account
    // normalization. Aliases cover values already present in Student.Program.
    internal static class ProgramCatalog
    {
        private sealed record ProgramOption(string Name, params string[] Aliases);

        private static readonly IReadOnlyList<ProgramOption> Programs = new List<ProgramOption>
        {
            new(
                "Bachelor of Science in Information Technology",
                "BSIT", "BS IT", "BS Information Technology",
                "Bachelor of Science Information Technology",
                "Bachelor Science of Information Technology"),
            new(
                "Bachelor of Science in Computer Science",
                "BSCS", "BS CS", "BS Computer Science",
                "Bachelor of Science Computer Science"),
            new(
                "Bachelor of Science in Computer Engineering",
                "BSCPE", "BSCpE", "BS CPE", "BS Computer Engineering",
                "Bachelor of Science Computer Engineering"),
            new(
                "Master of Science in Information Technology",
                "MSIT", "MS IT", "MS Information Technology",
                "Master of Science Information Technology"),
            new(
                "Master of Science in Computer Science",
                "MSCS", "MS CS", "MS Computer Science",
                "Master of Science Computer Science")
        };

        public static List<string> Search(string term)
        {
            var normalizedTerm = Normalize(term);
            if (normalizedTerm.Length == 0)
                return new List<string>();

            return Programs
                .Where(program => Candidates(program)
                    .Any(candidate => Normalize(candidate).Contains(normalizedTerm)))
                .Select(program => program.Name)
                .ToList();
        }

        public static string Canonicalize(string value)
        {
            var trimmed = value.Trim();
            var normalized = Normalize(trimmed);
            var match = Programs.FirstOrDefault(program => Candidates(program)
                .Any(candidate => Normalize(candidate) == normalized));

            // Unknown future programs remain usable instead of being rejected.
            return match?.Name ?? trimmed;
        }

        private static IEnumerable<string> Candidates(ProgramOption program) =>
            new[] { program.Name }.Concat(program.Aliases);

        private static string Normalize(string value) =>
            new(value
                .Where(char.IsLetterOrDigit)
                .Select(char.ToUpperInvariant)
                .ToArray());
    }
}

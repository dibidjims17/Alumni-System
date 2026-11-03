namespace MyApp.Application.Services
{
    public record CareerAlignmentSuggestion(string Value, string Reason);

    // A conservative deterministic suggestion engine. It only preselects an
    // answer when program-to-role keywords are reasonably clear; ambiguous
    // cases remain "Needs Review" so an admin must decide.
    public static class CareerAlignmentSuggester
    {
        public const string Aligned = "Aligned";
        public const string Related = "Related";
        public const string NotAligned = "Not Aligned";
        public const string NotApplicable = "Not Applicable";
        public const string NeedsReview = "Needs Review";

        public static readonly IReadOnlyList<string> ConfirmedValues =
            new[] { Aligned, Related, NotAligned, NotApplicable };

        private static readonly string[] ItKeywords =
        {
            "information technology", "it support", "systems administrator",
            "system administrator", "network administrator", "network engineer",
            "cybersecurity", "security analyst", "cloud engineer", "cloud architect",
            "database administrator", "software engineer", "software developer",
            "web developer", "mobile developer", "programmer", "devops",
            "quality assurance", "qa engineer", "data analyst", "business analyst",
            "solutions architect"
        };

        private static readonly string[] CsKeywords =
        {
            "computer science", "software engineer", "software developer", "programmer",
            "web developer", "mobile developer", "game developer", "data scientist",
            "data analyst", "machine learning", "artificial intelligence", "algorithm",
            "database", "cybersecurity", "devops", "quality assurance", "qa engineer"
        };

        private static readonly string[] CpeKeywords =
        {
            "computer engineer", "hardware engineer", "firmware engineer", "embedded",
            "electronics engineer", "semiconductor", "robotics", "automation engineer",
            "internet of things", "iot", "network engineer", "telecommunications engineer"
        };

        private static readonly string[] TechnologyAdjacentKeywords =
        {
            "technology", "technical support", "telecommunications", "telecom",
            "business process outsourcing", "bpo", "research", "education",
            "project manager", "product manager", "operations analyst", "digital"
        };

        private static readonly string[] ClearlyUnrelatedKeywords =
        {
            "nursing", "nurse", "hospitality", "tourism", "chef", "cook",
            "food service", "cashier", "retail sales", "construction", "agriculture",
            "accountant", "accounting", "human resources", "recruiter", "driver",
            "security guard", "lawyer", "legal services"
        };

        public static CareerAlignmentSuggestion Suggest(
            string? program,
            string? employmentStatus,
            string? jobTitle,
            string? industry)
        {
            if (string.Equals(employmentStatus, "Unemployed", StringComparison.OrdinalIgnoreCase))
            {
                return new CareerAlignmentSuggestion(
                    NotApplicable,
                    "No current occupation is available to compare with the graduate program.");
            }

            if (string.Equals(employmentStatus, "Further Studies", StringComparison.OrdinalIgnoreCase))
            {
                return new CareerAlignmentSuggestion(
                    NeedsReview,
                    "Confirm whether the alumnus's current field of study is related to their graduate program.");
            }

            var normalizedProgram = Normalize(program);
            var careerText = Normalize($"{jobTitle} {industry}");
            if (string.IsNullOrWhiteSpace(careerText))
            {
                return new CareerAlignmentSuggestion(
                    NeedsReview,
                    "No job title or industry was supplied, so the relationship must be assessed manually.");
            }

            var programKeywords = ProgramKeywords(normalizedProgram);
            var programLabel = string.IsNullOrWhiteSpace(program) ? "the graduate program" : program.Trim();

            var exactMatch = FirstMatch(careerText, programKeywords);
            if (exactMatch != null)
            {
                return new CareerAlignmentSuggestion(
                    Aligned,
                    $"Matched “{exactMatch}” to a common career path for {programLabel}.");
            }

            var relatedMatch = FirstMatch(careerText, TechnologyAdjacentKeywords);
            if (relatedMatch != null)
            {
                return new CareerAlignmentSuggestion(
                    Related,
                    $"Matched “{relatedMatch}” to a technology-adjacent career path.");
            }

            var unrelatedMatch = FirstMatch(careerText, ClearlyUnrelatedKeywords);
            if (unrelatedMatch != null)
            {
                return new CareerAlignmentSuggestion(
                    NotAligned,
                    $"Matched “{unrelatedMatch}”, which is outside the usual career paths for {programLabel}.");
            }

            return new CareerAlignmentSuggestion(
                NeedsReview,
                $"No strong rule matched this role to {programLabel}. Confirm the relationship manually.");
        }

        private static IReadOnlyList<string> ProgramKeywords(string normalizedProgram)
        {
            if (ContainsAny(normalizedProgram, "computer engineering", "bscpe", "bs cpe"))
                return CpeKeywords;

            if (ContainsAny(normalizedProgram, "computer science", "bscs", "mscs"))
                return CsKeywords;

            if (ContainsAny(normalizedProgram, "information technology", "bsit", "msit"))
                return ItKeywords;

            return Array.Empty<string>();
        }

        private static string? FirstMatch(string normalizedText, IEnumerable<string> keywords) =>
            keywords.FirstOrDefault(keyword => ContainsPhrase(normalizedText, Normalize(keyword)));

        private static bool ContainsAny(string text, params string[] values) =>
            values.Any(value => ContainsPhrase(text, Normalize(value)));

        private static bool ContainsPhrase(string text, string phrase) =>
            $" {text} ".Contains($" {phrase} ", StringComparison.Ordinal);

        private static string Normalize(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return string.Empty;

            var chars = value
                .ToLowerInvariant()
                .Select(ch => char.IsLetterOrDigit(ch) ? ch : ' ')
                .ToArray();

            return string.Join(' ', new string(chars)
                .Split(' ', StringSplitOptions.RemoveEmptyEntries));
        }
    }
}

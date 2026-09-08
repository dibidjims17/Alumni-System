namespace MyApp.Shared
{
    // Single source of truth for user-chosen password strength, mirrored by
    // the mobile and admin clients for live checklist UI. Temporary system
    // passwords follow their own generator and always satisfy this rule.
    public static class PasswordRules
    {
        public const int MinLength = 8;
        public const string SpecialChars = "!@#$%^&*()-_=+[]{};:,.<>?";

        public static IReadOnlyList<(string Key, string Label)> Requirements { get; } =
        [
            ("length", $"At least {MinLength} characters"),
            ("upper", "One uppercase letter (A–Z)"),
            ("lower", "One lowercase letter (a–z)"),
            ("digit", "One number (0–9)"),
            ("special", "One special character (!@#$…)"),
        ];

        public static Dictionary<string, bool> Evaluate(string? password)
        {
            var pw = password ?? string.Empty;
            return new Dictionary<string, bool>
            {
                ["length"] = pw.Length >= MinLength,
                ["upper"] = pw.Any(char.IsUpper),
                ["lower"] = pw.Any(char.IsLower),
                ["digit"] = pw.Any(char.IsDigit),
                ["special"] = pw.Any(ch => !char.IsLetterOrDigit(ch)),
            };
        }

        public static (bool Ok, string Message) Check(string? password, string? currentPassword = null)
        {
            var results = Evaluate(password);
            var missing = Requirements
                .Where(r => !results[r.Key])
                .Select(r => r.Label)
                .ToList();
            if (missing.Count > 0)
                return (false, "Password must include: " + string.Join(", ", missing) + ".");

            if (!string.IsNullOrEmpty(currentPassword) && password == currentPassword)
                return (false, "New password must be different from the current password.");

            return (true, "Password meets all requirements.");
        }
    }
}

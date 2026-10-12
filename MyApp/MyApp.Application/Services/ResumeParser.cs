using System.Text.RegularExpressions;
using UglyToad.PdfPig;

namespace MyApp.Application.Services
{
    // Heuristic resume parser. Deliberately conservative: it only extracts
    // high-confidence fields (contact, dated entries, dictionary skills) and
    // never guesses at ambiguous text — a missed field beats a wrong one.
    public static class ResumeParser
    {
        public sealed record ParsedWork(string JobTitle, string Company, string Location,
            DateTime StartDate, DateTime? EndDate, string Description);
        public sealed record ParsedEducation(string Degree, string FieldOfStudy, string School,
            int StartYear, int? EndYear);
        public sealed record ParsedResume(string? Phone, List<ParsedWork> Work,
            List<ParsedEducation> Education, List<string> Skills,
            string? Summary = null, string? Location = null, string? LinkedInUrl = null,
            string? Headline = null);

        private static readonly string[] ExperienceHeadings =
            ["work experience", "experience", "employment", "employment history",
             "work history", "professional experience"];

        private static readonly string[] EducationHeadings =
            ["education", "educational background", "academic background",
             "academic qualifications", "qualifications"];

        private static readonly string[] SkillsHeadings =
            ["skills", "technical skills", "core skills", "key skills",
             "competencies", "technologies", "tech stack"];

        private static readonly string[] SummaryHeadings =
            ["professional summary", "summary", "objective", "profile",
             "about me"];

        private static readonly string[] DegreeKeywords =
            ["bachelor", "master", "doctor", "phd", "associate", "diploma",
             "certificate", "tesda", "undergraduate", "graduate"];

        private static readonly string[] SchoolKeywords =
            ["university", "college", "school", "institute", "academy",
             "polytechnic", "university"];

        // Curated dictionary — matching is case-insensitive, whole-word.
        private static readonly string[] SkillDictionary =
        [
            "C#", "Java", "Python", "JavaScript", "TypeScript", "PHP", "Kotlin",
            "Swift", "Dart", "Flutter", "React", "Angular", "Vue", "Node.js",
            ".NET", "ASP.NET Core", "ASP.NET", "Laravel", "Django", "Spring Boot", "SQL", "MySQL",
            "PostgreSQL", "MongoDB", "SQLite", "Firebase", "Git", "GitHub",
            "Docker", "AWS", "Azure", "Google Cloud", "HTML", "CSS", "Tailwind",
            "Bootstrap", "Figma", "Photoshop", "Illustrator", "AutoCAD",
            "MS Excel", "Excel", "MS Word", "WordPress", "SEO", "Digital Marketing",
            "Data Analysis", "Machine Learning", "Data Entry", "Canva",
            "Video Editing", "Photography", "Communication", "Leadership",
            "Teamwork", "Time Management", "Problem Solving", "Critical Thinking",
            "Adaptability", "Customer Service", "Project Management", "Accounting",
            "Bookkeeping", "QuickBooks", "SAP", "Sales", "Marketing", "Copywriting",
            "Content Writing", "Research", "Teaching", "Tutoring", "Nursing",
            "Caregiving", "Cooking", "Driving", "Welding", "Electrical",
            "Plumbing", "Carpentry", "Sewing", "Programming", "Web Development",
            "Mobile Development", "UI/UX", "Cybersecurity", "Networking",
            "Technical Support", "Quality Assurance", "Testing", "Agile", "Scrum",
            "Microsoft Office", "Google Workspace", "Power BI", "Tableau",
            "R", "MATLAB", "C++", "C", "Ruby", "Go", "Rust", "Flutter",
            "Ionic", "Xamarin", "Redis", "Elasticsearch", "Linux", "Windows Server"
        ];

        private static readonly Regex DateRangeRegex = new(
            @"(?<s>(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4})\s*[-–—to]+\s*(?<e>(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{4}|present|current|now)",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly Regex YearRegex = new(
            @"(?<!\d)(19|20)\d{2}(?!\d)", RegexOptions.Compiled);

        private static readonly Regex PhMobileRegex = new(
            @"(\+63|0)\s*9\d{2}[\s-]?\d{3}[\s-]?\d{4}", RegexOptions.Compiled);

        public static List<string> ExtractLines(byte[] pdfBytes)
        {
            // page.Text collapses QuestPDF output into one blob (no line
            // breaks), which starves the section splitter — so rebuild lines
            // from word positions. Words join the current line when their
            // vertical span overlaps it (hyphens sit higher than the
            // baseline, so centroid bucketing would strand "-" on its own
            // line and break date ranges like "Jul 2026 - Present").
            using var document = PdfDocument.Open(pdfBytes);
            var lines = new List<string>();
            foreach (var page in document.GetPages())
            {
                var words = page.GetWords().ToList();
                if (words.Count == 0)
                {
                    foreach (var line in page.Text.Split('\n'))
                    {
                        var t = line.Trim();
                        if (!string.IsNullOrWhiteSpace(t)) lines.Add(t);
                    }
                    continue;
                }
                var ordered = words.OrderByDescending(w => w.BoundingBox.Centroid.Y).ToList();
                var current = new List<UglyToad.PdfPig.Content.Word>();
                double top = double.NaN, bottom = double.NaN;
                void Flush()
                {
                    if (current.Count == 0) return;
                    var text = string.Join(" ",
                        current.OrderBy(w => w.BoundingBox.Centroid.X)
                               .Select(w => w.Text.Trim())
                               .Where(t => t.Length > 0)).Trim();
                    if (!string.IsNullOrWhiteSpace(text))
                        lines.Add(text);
                    current.Clear();
                    top = bottom = double.NaN;
                }
                foreach (var w in ordered)
                {
                    var wt = w.BoundingBox.Top;
                    var wb = w.BoundingBox.Bottom;
                    if (current.Count > 0 && (wb > top + 1 || wt < bottom - 1))
                    {
                        Flush();
                    }
                    current.Add(w);
                    top = double.IsNaN(top) ? wt : Math.Max(top, wt);
                    bottom = double.IsNaN(bottom) ? wb : Math.Min(bottom, wb);
                }
                Flush();
            }
            return lines;
        }

        private static bool IsHeading(string line, string[] headings)
        {
            var normalized = new string(line.Where(c => char.IsLetter(c) || c == ' ').ToArray())
                .Trim().ToLowerInvariant();
            return normalized.Length <= 40 && headings.Contains(normalized);
        }

        private static Dictionary<string, List<string>> SplitSections(List<string> lines)
        {
            var sections = new Dictionary<string, List<string>>
            {
                ["contact"] = new(),
                ["experience"] = new(),
                ["education"] = new(),
                ["skills"] = new(),
                ["summary"] = new(),
                ["other"] = new(),
            };
            var current = "contact";
            foreach (var line in lines.Take(600))
            {
                if (IsHeading(line, ExperienceHeadings)) { current = "experience"; continue; }
                if (IsHeading(line, EducationHeadings)) { current = "education"; continue; }
                if (IsHeading(line, SkillsHeadings)) { current = "skills"; continue; }
                if (IsHeading(line, SummaryHeadings)) { current = "summary"; continue; }
                sections[current].Add(line);
            }
            return sections;
        }

        private static bool TryParseDate(string text, out DateTime date)
        {
            date = default;
            text = text.Trim().TrimEnd('.');
            if (DateTime.TryParseExact(text,
                    ["MMM yyyy", "MMMM yyyy", "MMM. yyyy", "yyyy"],
                    System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.None, out date))
                return true;
            if (Regex.IsMatch(text, @"^\d{4}$") && int.TryParse(text, out var year))
            {
                date = new DateTime(year, 1, 1);
                return true;
            }
            return false;
        }

        private static bool IsPresentWord(string text)
        {
            var t = text.Trim().ToLowerInvariant();
            return t is "present" or "current" or "now" or "present.";
        }

        public static ParsedResume Parse(byte[] pdfBytes)
        {
            var lines = ExtractLines(pdfBytes);
            var sections = SplitSections(lines);

            // Phone: PH mobile first, then any plausible international number.
            string? phone = null;
            foreach (var line in lines.Take(40))
            {
                var m = PhMobileRegex.Match(line);
                if (m.Success) { phone = Regex.Replace(m.Value, @"[\s-]", ""); break; }
            }
            if (phone == null)
            {
                foreach (var line in lines.Take(40))
                {
                    var digits = new string(line.Where(char.IsDigit).ToArray());
                    if (digits.Length is >= 7 and <= 15 && line.Any(char.IsDigit))
                    {
                        phone = "+" + digits.TrimStart('0');
                        if (line.Contains('+') || digits.Length >= 10) break;
                        phone = null;
                    }
                }
            }

            // Work: chunk experience lines on date-range lines.
            var work = new List<ParsedWork>();
            List<string> chunk = new();
            void FlushWork()
            {
                if (chunk.Count == 0) return;
                var entry = ParseWorkChunk(chunk);
                if (entry != null && work.Count < 5) work.Add(entry);
                chunk = new List<string>();
            }
            foreach (var line in sections["experience"])
            {
                if (DateRangeRegex.IsMatch(line) && chunk.Count > 0) FlushWork();
                chunk.Add(line);
            }
            FlushWork();

            // Education: chunk on lines carrying a year.
            var education = new List<ParsedEducation>();
            List<string> eduChunk = new();
            void FlushEdu()
            {
                if (eduChunk.Count == 0) return;
                var entry = ParseEducationChunk(eduChunk);
                if (entry != null && education.Count < 3) education.Add(entry);
                eduChunk = new List<string>();
            }
            foreach (var line in sections["education"])
            {
                if (YearRegex.IsMatch(line) && eduChunk.Count > 0) FlushEdu();
                eduChunk.Add(line);
            }
            FlushEdu();

            // Summary section (our generator writes Bio/Headline here).
            string? summary = null;
            if (sections["summary"].Count > 0)
            {
                var text = string.Join(" ", sections["summary"]).Trim();
                if (text.Length > 500) text = text[..500];
                if (text.Length >= 10) summary = text;
            }

            // Headline: our generator prints it as the lone line between the
            // name line and the pipe-joined contact line (which carries @).
            // Strict 3-line gate so foreign CVs rarely qualify — and fill is
            // blank-only with user review anyway.
            string? headline = null;
            var contact = sections["contact"];
            if (contact.Count >= 3
                && !contact[1].Contains('|') && !contact[1].Contains('@')
                && contact[2].Contains('|') && contact[2].Contains('@')
                && contact[1].Length is >= 3 and <= 100)
            {
                headline = contact[1].Trim();
            }

            // Contact header: our generator joins "email | phone | location |
            // linkedin" on one pipe-separated line. Only trust that exact
            // shape (must contain the email segment) — never guess from
            // stray lines. Remaining segments: URL -> LinkedIn, first other
            // non-empty segment -> location.
            string? location = null;
            string? linkedInUrl = null;
            foreach (var line in sections["contact"])
            {
                if (!line.Contains('|') || !line.Contains('@')) continue;
                var segs = line.Split('|').Select(s => s.Trim())
                    .Where(s => s.Length > 0).ToList();
                if (segs.Count < 2) continue;
                foreach (var seg in segs)
                {
                    if (seg.Contains('@')) continue;
                    if (PhMobileRegex.IsMatch(seg)) continue;
                    if (seg.StartsWith("http", StringComparison.OrdinalIgnoreCase)
                        || seg.Contains("linkedin", StringComparison.OrdinalIgnoreCase))
                    {
                        linkedInUrl ??= seg;
                    }
                    else
                    {
                        location ??= seg;
                    }
                }
                if (location != null || linkedInUrl != null) break;
            }

            // Skills: dictionary match over the skills section (whole doc fallback).
            // Longest-first with matched spans blanked out, so "ASP.NET" never
            // double-fires inside "ASP.NET Core" and bare "C" never fires
            // inside "C#".
            var skillSource = sections["skills"].Count > 0
                ? string.Join("\n", sections["skills"])
                : string.Join("\n", lines);
            var buffer = skillSource;
            var skills = new List<string>();
            foreach (var s in SkillDictionary.OrderByDescending(s => s.Length))
            {
                var m = Regex.Match(buffer,
                    $@"(?<!\w){Regex.Escape(s)}(?!\w)",
                    RegexOptions.IgnoreCase);
                if (!m.Success) continue;
                skills.Add(s);
                buffer = buffer.Remove(m.Index, m.Length)
                    .Insert(m.Index, new string(' ', m.Length));
                if (skills.Count >= 12) break;
            }

            return new ParsedResume(phone, work, education, skills, summary, location, linkedInUrl, headline);
        }

        private static ParsedWork? ParseWorkChunk(List<string> chunk)
        {
            var dateLine = chunk.FirstOrDefault(DateRangeRegex.IsMatch);
            if (dateLine == null) return null;

            var match = DateRangeRegex.Match(dateLine);
            if (!TryParseDate(match.Groups["s"].Value, out var start)) return null;
            DateTime? end = null;
            var endText = match.Groups["e"].Value;
            if (!IsPresentWord(endText))
            {
                if (!TryParseDate(endText, out var endDate)) return null;
                end = endDate;
            }

            var rest = chunk.Where(l => l != dateLine).ToList();
            var remainder = DateRangeRegex.Replace(dateLine, "").Trim(" -–—to,|".ToCharArray()).Trim();
            string title = remainder.Length >= 3 ? remainder : rest.FirstOrDefault() ?? string.Empty;
            var afterTitle = rest.Skip(remainder.Length >= 3 ? 0 : 1).ToList();
            string company = string.Empty;
            var companyLine = afterTitle.FirstOrDefault(l => l.Contains('|') || l.Contains('—') || l.Contains('@'));
            if (companyLine != null)
            {
                company = companyLine.Split(['|', '—', '@'], StringSplitOptions.RemoveEmptyEntries)
                    .Select(p => p.Trim(' ', '-', '–', ',')).FirstOrDefault(p => p.Length >= 2) ?? string.Empty;
                afterTitle.Remove(companyLine);
            }
            if (string.IsNullOrWhiteSpace(company))
            {
                company = afterTitle.FirstOrDefault() ?? string.Empty;
                if (afterTitle.Count > 0) afterTitle.RemoveAt(0);
            }
            if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(company)) return null;

            var description = string.Join(" ", afterTitle).Trim();
            if (description.Length > 500) description = description[..500];

            return new ParsedWork(title.Trim(), company.Trim(), string.Empty,
                start, end, description);
        }

        private static ParsedEducation? ParseEducationChunk(List<string> chunk)
        {
            var years = YearRegex.Matches(string.Join(" ", chunk))
                .Select(m => int.Parse(m.Value)).Distinct().OrderBy(y => y).ToList();
            if (years.Count == 0) return null;

            var degreeLine = chunk.FirstOrDefault(l =>
                DegreeKeywords.Any(k => l.ToLowerInvariant().Contains(k)));
            var schoolLine = chunk.FirstOrDefault(l =>
                SchoolKeywords.Any(k => l.ToLowerInvariant().Contains(k)));

            var degree = degreeLine ?? chunk.FirstOrDefault() ?? string.Empty;
            var school = schoolLine ?? chunk.Skip(1).FirstOrDefault() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(school)) return null;

            var startYear = years.First();
            int? endYear = years.Count > 1 ? years.Last() : null;
            if (chunk.Any(l => IsPresentWord(l) || l.ToLowerInvariant().Contains("present")))
                endYear ??= null;

            return new ParsedEducation(degree.Trim(), string.Empty, school.Trim(), startYear, endYear);
        }
    }
}

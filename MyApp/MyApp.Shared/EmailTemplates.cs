using System.Net;

namespace MyApp.Shared
{
    // Branded Reunio mail kit. Every template returns (PlainText, Html) so
    // senders emit multipart/alternative: rich clients render the HTML,
    // plain-text clients fall back gracefully. All user content is encoded
    // at the boundary — never pass pre-encoded strings in.
    public static class EmailTemplates
    {
        private static string Layout(string heading, string bodyHtml, string? footer = null)
        {
            return $@"<!DOCTYPE html>
<html><head><meta charset=""utf-8""><meta name=""viewport"" content=""width=device-width""></head>
<body style=""margin:0;padding:0;background-color:#E9EFE7;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;"">
<table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0""><tr><td align=""center"" style=""padding:28px 12px;"">
<table role=""presentation"" width=""560"" cellpadding=""0"" cellspacing=""0"" style=""max-width:560px;width:100%;"">
<tr><td style=""background-color:#0F3513;border-radius:14px 14px 0 0;padding:22px 26px;"">
<div style=""color:#A5D6A7;font-size:11px;font-weight:bold;letter-spacing:2px;"">REUNIO &middot; ALUMNI CONNECT</div>
<div style=""color:#FFFFFF;font-size:20px;font-weight:bold;margin-top:6px;"">{heading}</div>
</td></tr>
<tr><td style=""background-color:#FFFFFF;border-radius:0 0 14px 14px;padding:26px;font-size:14px;line-height:1.65;color:#1B231D;"">
{bodyHtml}
</td></tr>
<tr><td style=""padding:16px 8px 0;text-align:center;color:#5C6B60;font-size:12px;"">
{footer ?? "Reunio &middot; your alumni community in your pocket."}
</td></tr>
</table>
</td></tr></table>
</body></html>";
        }

        private static string CodeBox(string code) =>
            $@"<div style=""text-align:center;margin:18px 0;""><span style=""display:inline-block;font-family:Consolas,Menlo,monospace;font-size:26px;font-weight:bold;letter-spacing:6px;color:#0F3513;background-color:#E9EFE6;border:1px solid #C9D6C4;border-radius:10px;padding:12px 18px 12px 24px;"">{WebUtility.HtmlEncode(code)}</span></div>";

        private static string Button(string url, string label) =>
            $@"<div style=""text-align:center;margin:20px 0 6px;""><a href=""{url}"" style=""display:inline-block;background-color:#1B5E20;color:#FFFFFF;font-size:14px;font-weight:bold;text-decoration:none;border-radius:10px;padding:13px 28px;"">{WebUtility.HtmlEncode(label)}</a></div>";

        private static string P(string text) =>
            $@"<p style=""margin:0 0 12px;"">{text}</p>";

        public static (string Plain, string Html) Invite(
            string fullName, string email, string studentNumber, string temporaryPassword,
            int validDays, string siteUrl, string? apkUrl)
        {
            var name = WebUtility.HtmlEncode(fullName);
            var mail = WebUtility.HtmlEncode(email);
            var number = WebUtility.HtmlEncode(studentNumber);
            var plain =
                $"Hello {fullName},\n\nYour school has created your Reunio alumni account.\n\n" +
                $"Sign in with your email: {email} (student number {studentNumber} works too)\nTemporary password: {temporaryPassword}\n" +
                $"This password expires in {validDays} days — please log in and change it right away. " +
                $"If it expires first, use Forgot Password on the login screen to set a new one.\n\n" +
                (string.IsNullOrWhiteSpace(siteUrl) ? "" : $"Learn more and get the app on our website: {siteUrl}\n") +
                (string.IsNullOrWhiteSpace(apkUrl) ? "" : $"Or download the app directly: {apkUrl}\n") +
                "\nWelcome aboard!";
            var html = Layout("Welcome to Reunio 🎓",
                P($"Hello <strong>{name}</strong>,") +
                P("Your school has created your Reunio alumni account. Here are your sign-in details:") +
                $@"<table role=""presentation"" cellpadding=""0"" cellspacing=""0"" style=""width:100%;background-color:#F2F5F0;border-radius:10px;margin:14px 0;""><tr><td style=""padding:14px 16px;font-size:13px;"">" +
                $@"<div>Email: <strong>{mail}</strong></div>" +
                $@"<div style=""margin-top:4px;"">Student number: <strong>{number}</strong> (also works as username)</div>" +
                $@"<div style=""margin-top:4px;"">Temporary password: <strong>{WebUtility.HtmlEncode(temporaryPassword)}</strong></div>" +
                $@"</td></tr></table>" +
                P($"This password expires in <strong>{validDays} days</strong> — please log in and change it right away. If it expires first, use <strong>Forgot Password</strong> on the login screen.") +
                (string.IsNullOrWhiteSpace(siteUrl) ? "" : Button(siteUrl, "🌐 Explore Reunio on the web")) +
                (string.IsNullOrWhiteSpace(apkUrl) ? "" : P($@"Prefer a direct download? <a href=""{apkUrl}"" style=""color:#1B5E20;font-weight:bold;"">Get the APK here</a>.")),
                "Jobs, news, events, and batchmates — one alumni home.");
            return (plain, html);
        }

        public static (string Plain, string Html) AdminWelcome(
            string fullName, string username, string password, string role)
        {
            var plain =
                $"Hello {fullName},\n\nAn administrator account has been created for you on the School Alumni Portal.\n\n" +
                $"Username: {username}\nTemporary password: {password}\nRole: {role}\n\n" +
                "Please log in and change your password. If you did not expect this account, contact your administrator.";
            var html = Layout("Your admin account is ready 🛡️",
                P($"Hello <strong>{WebUtility.HtmlEncode(fullName)}</strong>,") +
                P("An administrator account has been created for you on the School Alumni Portal:") +
                $@"<table role=""presentation"" cellpadding=""0"" cellspacing=""0"" style=""width:100%;background-color:#F2F5F0;border-radius:10px;margin:14px 0;""><tr><td style=""padding:14px 16px;font-size:13px;"">" +
                $@"<div>Username: <strong>{WebUtility.HtmlEncode(username)}</strong></div>" +
                $@"<div style=""margin-top:4px;"">Temporary password: <strong>{WebUtility.HtmlEncode(password)}</strong></div>" +
                $@"<div style=""margin-top:4px;"">Role: <strong>{WebUtility.HtmlEncode(role)}</strong></div>" +
                $@"</td></tr></table>" +
                P("Please log in and change your password. If you did not expect this account, contact your administrator."));
            return (plain, html);
        }

        public static (string Plain, string Html) YearApproved(
            string fullName, string newYear, string siteUrl, string? apkUrl)
        {
            var plain =
                $"Hello {fullName},\n\nGood news — your year level has been updated to: {newYear}.\n\n" +
                (newYear.Trim().Equals("Graduate", StringComparison.OrdinalIgnoreCase)
                    ? "You now have access to graduate jobs, events, and document services. If your password no longer works, use Forgot Password on the login screen.\n\n"
                    : "Please log in to see the change reflected in your account.\n\n") +
                (string.IsNullOrWhiteSpace(siteUrl) ? "" : $"Get the mobile app here: {siteUrl}\n") +
                (string.IsNullOrWhiteSpace(apkUrl) ? "" : $"Or download directly: {apkUrl}\n");
            var html = Layout("Year level updated ✅",
                P($"Hello <strong>{WebUtility.HtmlEncode(fullName)}</strong>,") +
                P($"Good news — your year level is now <strong>{WebUtility.HtmlEncode(newYear)}</strong>.") +
                (newYear.Trim().Equals("Graduate", StringComparison.OrdinalIgnoreCase)
                    ? P("You now have access to graduate jobs, events, and document services. If your password no longer works, use <strong>Forgot Password</strong> on the login screen.")
                    : P("Please log in to see the change reflected in your account.")) +
                (string.IsNullOrWhiteSpace(siteUrl) ? "" : Button(siteUrl, "🌐 Explore Reunio on the web")) +
                (string.IsNullOrWhiteSpace(apkUrl) ? "" : P($@"Prefer a direct download? <a href=""{apkUrl}"" style=""color:#1B5E20;font-weight:bold;"">Get the APK here</a>.")));
            return (plain, html);
        }

        public static (string Plain, string Html) ResetCode(string code, bool forAdmin)
        {
            var who = forAdmin ? "admin" : "";
            var plain =
                $"Your {(forAdmin ? "admin " : "")}password reset code is: {code}\n\n" +
                "This code expires in 15 minutes. If you did not request this, you can safely ignore this email.";
            var html = Layout("Password reset code 🔑",
                P($"Use the code below to reset your {(forAdmin ? "admin " : "")}password. It expires in <strong>15 minutes</strong>:") +
                CodeBox(code) +
                P("If you did not request this, you can safely ignore this email."));
            return (plain, html);
        }

        public static (string Plain, string Html) ApplicationStatus(string jobTitle, string status)
        {
            var title = WebUtility.HtmlEncode(jobTitle);
            var plain =
                $"Hello,\n\nYour application for \"{jobTitle}\" has been updated to: {status}.\n\n" +
                "Please check the alumni app for more details.\n\nThank you.";
            var html = Layout("Application update 💼",
                P("Hello,") +
                P($"Your application for <strong>&ldquo;{title}&rdquo;</strong> has been updated:") +
                $@"<div style=""text-align:center;margin:16px 0;""><span style=""display:inline-block;font-size:15px;font-weight:bold;color:#1B5E20;background-color:#DDEBD9;border-radius:999px;padding:8px 20px;"">{WebUtility.HtmlEncode(status)}</span></div>" +
                P("Please check the alumni app for more details. Thank you."));
            return (plain, html);
        }

        public static (string Plain, string Html) CommentReply(string replierName, string newsTitle)
        {
            var plain = $"{replierName} replied to your comment on \"{newsTitle}\".\n\nCheck the alumni app for details.";
            var html = Layout("New reply 💬",
                P($"<strong>{WebUtility.HtmlEncode(replierName)}</strong> replied to your comment on <strong>&ldquo;{WebUtility.HtmlEncode(newsTitle)}&rdquo;</strong>.") +
                P("Check the alumni app for details."));
            return (plain, html);
        }

        public static (string Plain, string Html) Mention(string mentionerName, string newsTitle)
        {
            var plain = $"{mentionerName} mentioned you in a comment on \"{newsTitle}\".\n\nCheck the alumni app for details.";
            var html = Layout("You were mentioned 📣",
                P($"<strong>{WebUtility.HtmlEncode(mentionerName)}</strong> mentioned you in a comment on <strong>&ldquo;{WebUtility.HtmlEncode(newsTitle)}&rdquo;</strong>.") +
                P("Check the alumni app for details."));
            return (plain, html);
        }

    }
}

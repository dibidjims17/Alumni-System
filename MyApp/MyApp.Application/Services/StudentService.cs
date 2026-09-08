using Microsoft.Extensions.Configuration;
using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Shared.DTOs;

namespace MyApp.Application.Services
{
    public class StudentService : IStudentService
    {
        private readonly IStudentRepository _studentRepository;
        private readonly IActivityLogRepository _activityLogRepository;
        private readonly IAlumniDocumentService _documentService;
        private readonly IAlumniProfileRepository _profileRepository;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;

        public StudentService(
            IStudentRepository studentRepository,
            IActivityLogRepository activityLogRepository,
            IAlumniDocumentService documentService,
            IAlumniProfileRepository profileRepository,
            IEmailService emailService,
            IConfiguration configuration)
        {
            _studentRepository = studentRepository;
            _activityLogRepository = activityLogRepository;
            _documentService = documentService;
            _profileRepository = profileRepository;
            _emailService = emailService;
            _configuration = configuration;
        }

        public async Task<List<StudentDto>> GetAllStudentsAsync()
        {
            var students = await _studentRepository.GetAllAsync();
            var profiles = await _profileRepository.GetByStudentIdsAsync(students.Select(s => s.Id));

            return students.Select(s =>
            {
                profiles.TryGetValue(s.Id, out var profile);
                return new StudentDto
                {
                    Id = s.Id,
                    StudentNumber = s.StudentNumber,
                    FullName = s.FullName,
                    Email = s.Email,
                    Program = s.Program,
                    SchoolYear = s.SchoolYear,
                    IsActive = s.IsActive,
                    CreatedAt = s.CreatedAt,
                    ProfilePicturePath = profile?.ProfilePicturePath
                };
            }).ToList();
        }

        public async Task<(int Total, int Active, int Graduate)> GetStatsAsync()
        {
            var total = await _studentRepository.CountAllAsync();
            var active = await _studentRepository.CountActiveAsync();
            var graduate = await _studentRepository.CountGraduateAsync();
            return (total, active, graduate);
        }

        public async Task<ImportResultDto> ImportStudentsAsync(List<ImportStudentDto> students, int adminId)
        {
            var result = new ImportResultDto();
            var newcomers = new List<(Student Student, string TemporaryPassword)>();

            foreach (var dto in students)
            {
                try
                {
                    if (string.IsNullOrWhiteSpace(dto.StudentNumber) ||
                        string.IsNullOrWhiteSpace(dto.FullName) ||
                        string.IsNullOrWhiteSpace(dto.Email))
                    {
                        result.Errors++;
                        result.ErrorMessages.Add($"Missing required fields for: {dto.StudentNumber}");
                        continue;
                    }

                    var existing = await _studentRepository.GetByStudentNumberAsync(dto.StudentNumber);
                    if (existing != null)
                    {
                        existing.FullName = dto.FullName;
                        existing.Email = dto.Email;
                        existing.Program = dto.Program;
                        existing.SchoolYear = dto.SchoolYear;
                        await _studentRepository.UpdateAsync(existing);
                        result.Skipped++;
                        continue;
                    }

                    var temporaryPassword = GenerateTemporaryPassword();

                    var student = new Student
                    {
                        StudentNumber = dto.StudentNumber,
                        FullName = dto.FullName,
                        Email = dto.Email,
                        Program = dto.Program,
                        SchoolYear = dto.SchoolYear,
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword(temporaryPassword),
                        IsActive = true,
                        MustChangePassword = true,
                        TemporaryPasswordExpiry = DateTime.UtcNow.AddDays(TemporaryPasswordValidDays),
                        CreatedAt = DateTime.UtcNow
                    };

                    await _studentRepository.CreateAsync(student);

                    // Auto-initialize documents for Graduate students only
                    if (dto.SchoolYear.Trim().Equals("Graduate", StringComparison.OrdinalIgnoreCase))
                    {
                        await _documentService.InitializeDocumentsAsync(student.Id, adminId);
                    }

                    newcomers.Add((student, temporaryPassword));
                    result.Imported++;
                }
                catch (Exception ex)
                {
                    result.Errors++;
                    result.ErrorMessages.Add($"Error importing {dto.StudentNumber}: {ex.Message}");
                }
            }

            await _activityLogRepository.LogAdminAsync(adminId, "BULK_IMPORT",
                $"Imported {result.Imported} students, {result.Skipped} updated, {result.Errors} errors", "system");

            // Invite every newly created account to the promo site so they can
            // download the app. Best effort per address — one bad email must
            // not fail the import or block the rest.
            result.EmailsSent = await SendInviteEmailsAsync(newcomers);

            return result;
        }

        // Temporary credentials live 7 days: long enough to onboard, short
        // enough that a leaked CSV row goes stale. Afterwards the holder
        // must use Forgot Password.
        private const int TemporaryPasswordValidDays = 7;

        // 12 chars from an unambiguous alphabet (no 0/O/1/l/I): upper +
        // lower + digits + symbols in every password by construction below.
        private static string GenerateTemporaryPassword()
        {
            const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
            const string lower = "abcdefghijkmnopqrstuvwxyz";
            const string digits = "23456789";
            const string symbols = "!@#$%&*";
            const string all = upper + lower + digits + symbols;
            var chars = new char[12];
            chars[0] = upper[System.Security.Cryptography.RandomNumberGenerator.GetInt32(upper.Length)];
            chars[1] = lower[System.Security.Cryptography.RandomNumberGenerator.GetInt32(lower.Length)];
            chars[2] = digits[System.Security.Cryptography.RandomNumberGenerator.GetInt32(digits.Length)];
            chars[3] = symbols[System.Security.Cryptography.RandomNumberGenerator.GetInt32(symbols.Length)];
            for (var i = 4; i < chars.Length; i++)
                chars[i] = all[System.Security.Cryptography.RandomNumberGenerator.GetInt32(all.Length)];
            // Fisher–Yates so the class positions aren't predictable.
            for (var i = chars.Length - 1; i > 0; i--)
            {
                var j = System.Security.Cryptography.RandomNumberGenerator.GetInt32(i + 1);
                (chars[i], chars[j]) = (chars[j], chars[i]);
            }
            return new string(chars);
        }

        private async Task<int> SendInviteEmailsAsync(List<(Student Student, string TemporaryPassword)> newcomers)
        {
            var websiteUrl = (_configuration["Site:WebsiteUrl"] ?? string.Empty).Trim().TrimEnd('/');
            if (newcomers.Count == 0 || string.IsNullOrWhiteSpace(websiteUrl))
                return 0;

            var sent = 0;
            foreach (var (student, temporaryPassword) in newcomers)
            {
                try
                {
                    var body = $"Hello {student.FullName},\n\n" +
                        $"Your school has created your Reunio alumni account.\n\n" +
                        $"Username (student number): {student.StudentNumber}\n" +
                        $"Temporary password: {temporaryPassword}\n" +
                        $"This password expires in {TemporaryPasswordValidDays} days — please log in and change it right away. " +
                        $"If it expires first, use Forgot Password on the login screen to set a new one.\n\n" +
                        $"Get the mobile app here: {websiteUrl}\n\n" +
                        $"Welcome aboard!";
                    await _emailService.SendEmailAsync(student.Email, "Your Reunio alumni account + mobile app", body);
                    sent++;
                }
                catch
                {
                    // Per-address failure — counted by omission, import stands.
                }
            }
            return sent;
        }

        public async Task<bool> ToggleStudentStatusAsync(int studentId, int adminId)
        {
            var student = await _studentRepository.GetByIdAsync(studentId);
            if (student == null) return false;

            student.IsActive = !student.IsActive;
            await _studentRepository.UpdateAsync(student);

            var action = student.IsActive ? "ACTIVATE_STUDENT" : "DEACTIVATE_STUDENT";
            await _activityLogRepository.LogAdminAsync(adminId, action,
                $"Student {student.StudentNumber} {(student.IsActive ? "activated" : "deactivated")}", "system");

            return true;
        }

        public async Task<bool> UpdateStudentAsync(int studentId, UpdateStudentRequest request, int adminId)
        {
            var student = await _studentRepository.GetByIdAsync(studentId);
            if (student == null) return false;

            student.FullName = request.FullName;
            student.Email = request.Email;
            student.Program = request.Program;
            student.SchoolYear = request.SchoolYear;
            await _studentRepository.UpdateAsync(student);

            await _activityLogRepository.LogAdminAsync(adminId, "UPDATE_STUDENT",
                $"Updated student record: {student.StudentNumber}", "system");

            return true;
        }

        public async Task<string?> ResetStudentPasswordAsync(int studentId, int adminId)
        {
            var student = await _studentRepository.GetByIdAsync(studentId);
            if (student == null) return null;

            // Crypto-random temporary password, shown to the admin once.
            var temporaryPassword = GenerateTemporaryPassword();

            student.PasswordHash = BCrypt.Net.BCrypt.HashPassword(temporaryPassword);
            student.MustChangePassword = true;
            student.TemporaryPasswordExpiry = DateTime.UtcNow.AddDays(TemporaryPasswordValidDays);
            student.PasswordResetCode = null;
            student.PasswordResetCodeExpiry = null;
            await _studentRepository.UpdateAsync(student);

            await _activityLogRepository.LogAdminAsync(adminId, "RESET_STUDENT_PASSWORD",
                $"Reset password for student: {student.StudentNumber}", "system");

            return temporaryPassword;
        }

        public async Task<StudentDto?> CreateStudentAsync(CreateStudentRequest request, int adminId)
        {
            var existing = await _studentRepository.GetByStudentNumberAsync(request.StudentNumber);
            if (existing != null) return null;

            var student = new Student
            {
                StudentNumber = request.StudentNumber,
                FullName = request.FullName,
                Email = request.Email,
                Program = request.Program,
                SchoolYear = request.SchoolYear,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.StudentNumber),
                IsActive = true,
                MustChangePassword = true,
                CreatedAt = DateTime.UtcNow
            };

            await _studentRepository.CreateAsync(student);

            // Auto-initialize documents for Graduate students only
            if (request.SchoolYear.Trim().Equals("Graduate", StringComparison.OrdinalIgnoreCase))
            {
                await _documentService.InitializeDocumentsAsync(student.Id, adminId);
            }

            await _activityLogRepository.LogAdminAsync(adminId, "CREATE_STUDENT",
                $"Created student: {request.StudentNumber}", "system");

            return new StudentDto
            {
                Id = student.Id,
                StudentNumber = student.StudentNumber,
                FullName = student.FullName,
                Email = student.Email,
                Program = student.Program,
                SchoolYear = student.SchoolYear,
                IsActive = student.IsActive,
                CreatedAt = student.CreatedAt
            };
        }
    }
}
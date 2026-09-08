using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Shared.DTOs;

namespace MyApp.Application.Services
{
    public class ProfileService : IProfileService
    {
        private readonly IAlumniProfileRepository _profileRepository;
        private readonly IJobPreferenceRepository _jobPreferenceRepository;
        private readonly IStudentRepository _studentRepository;
        private readonly IActivityLogRepository _activityLogRepository;
        private readonly IWorkExperienceRepository _workExperienceRepository;
        private readonly IEducationRepository _educationRepository;
        private readonly ISkillRepository _skillRepository;
        private readonly IYearLevelChangeRepository _yearChangeRepository;

        public ProfileService(
            IAlumniProfileRepository profileRepository,
            IJobPreferenceRepository jobPreferenceRepository,
            IStudentRepository studentRepository,
            IActivityLogRepository activityLogRepository,
            IWorkExperienceRepository workExperienceRepository,
            IEducationRepository educationRepository,
            ISkillRepository skillRepository,
            IYearLevelChangeRepository yearChangeRepository)
        {
            _profileRepository = profileRepository;
            _jobPreferenceRepository = jobPreferenceRepository;
            _studentRepository = studentRepository;
            _activityLogRepository = activityLogRepository;
            _workExperienceRepository = workExperienceRepository;
            _educationRepository = educationRepository;
            _skillRepository = skillRepository;
            _yearChangeRepository = yearChangeRepository;
        }

        private static readonly HashSet<string> ValidSchoolYears = new(StringComparer.OrdinalIgnoreCase)
        {
            "1", "2", "3", "4", "Graduate"
        };

        public async Task<(bool Success, string Message, YearChangeRequestDto? Request)> CreateYearChangeRequestAsync(
            int studentId, CreateYearChangeRequest request, string ipAddress)
        {
            var student = await _studentRepository.GetByIdAsync(studentId);
            if (student == null)
                return (false, "Account not found.", null);

            var wanted = (request.RequestedSchoolYear ?? string.Empty).Trim();
            if (!ValidSchoolYears.Contains(wanted))
                return (false, "Invalid year level.", null);

            if (wanted.Equals(student.SchoolYear.Trim(), StringComparison.OrdinalIgnoreCase))
                return (false, "That is already your recorded year level.", null);

            if (string.IsNullOrWhiteSpace(request.Reason))
                return (false, "Please tell us why the record is wrong.", null);

            var pending = await _yearChangeRepository.GetPendingByStudentAsync(studentId);
            if (pending != null)
                return (false, "You already have a pending request under review.", null);

            var entity = new YearLevelChangeRequest
            {
                StudentId = studentId,
                CurrentSchoolYear = student.SchoolYear,
                RequestedSchoolYear = wanted,
                Reason = request.Reason.Trim(),
                Status = "Pending"
            };
            await _yearChangeRepository.CreateAsync(entity);

            await _activityLogRepository.LogStudentAsync(studentId, "REQUEST_YEAR_CHANGE",
                $"Requested year change: {student.SchoolYear} → {wanted}", ipAddress);

            return (true, "Request submitted. An administrator will review it.", MapYearChange(entity, student.FullName, student.StudentNumber, null));
        }

        public async Task<List<YearChangeRequestDto>> GetMyYearChangeRequestsAsync(int studentId)
        {
            var student = await _studentRepository.GetByIdAsync(studentId);
            var list = await _yearChangeRepository.GetByStudentAsync(studentId);
            return list.Select(r => MapYearChange(r,
                student?.FullName ?? string.Empty,
                student?.StudentNumber ?? string.Empty,
                r.ReviewedByAdmin?.FullName)).ToList();
        }

        private static YearChangeRequestDto MapYearChange(
            YearLevelChangeRequest r, string studentName, string studentNumber, string? reviewerName)
        {
            return new YearChangeRequestDto
            {
                Id = r.Id,
                StudentId = r.StudentId,
                StudentName = studentName,
                StudentNumber = studentNumber,
                CurrentSchoolYear = r.CurrentSchoolYear,
                RequestedSchoolYear = r.RequestedSchoolYear,
                Reason = r.Reason,
                Status = r.Status,
                ReviewedByAdminName = reviewerName,
                ReviewNote = r.ReviewNote,
                CreatedAt = r.CreatedAt,
                ReviewedAt = r.ReviewedAt
            };
        }

        public async Task<AlumniProfileDto?> GetProfileAsync(int studentId)
        {
            var student = await _studentRepository.GetByIdAsync(studentId);
            if (student == null) return null;

            var profile = await _profileRepository.GetByStudentIdAsync(studentId);
            var workExperiences = await _workExperienceRepository.GetByStudentIdAsync(studentId);
            var educations = await _educationRepository.GetByStudentIdAsync(studentId);
            var skills = await _skillRepository.GetByStudentIdAsync(studentId);

            return new AlumniProfileDto
            {
                FullName = student.FullName,
                Program = student.Program,
                SchoolYear = student.SchoolYear,
                StudentNumber = student.StudentNumber,
                Headline = profile?.Headline ?? string.Empty,
                Bio = profile?.Bio ?? string.Empty,
                Location = profile?.Location ?? string.Empty,
                LinkedInUrl = profile?.LinkedInUrl ?? string.Empty,
                Phone = profile?.Phone ?? string.Empty,
                DateOfBirth = profile?.DateOfBirth,
                Address = profile?.Address ?? string.Empty,
                ShowInDirectory = student.ShowInDirectory,
                ProfilePictureUrl = profile?.ProfilePicturePath,
                WorkExperiences = workExperiences.Select(w => new WorkExperienceDto
                {
                    Id = w.Id,
                    JobTitle = w.JobTitle,
                    Company = w.Company,
                    Location = w.Location,
                    StartDate = w.StartDate,
                    EndDate = w.EndDate,
                    Description = w.Description
                }).ToList(),
                Educations = educations.Select(e => new EducationDto
                {
                    Id = e.Id,
                    Degree = e.Degree,
                    FieldOfStudy = e.FieldOfStudy,
                    School = e.School,
                    StartYear = e.StartYear,
                    EndYear = e.EndYear
                }).ToList(),
                Skills = skills.Select(s => s.SkillName).ToList()
            };
        }

        public async Task<bool> UpdateProfileAsync(int studentId, UpdateProfileRequest request, string ipAddress)
        {
            var student = await _studentRepository.GetByIdAsync(studentId);
            if (student != null && student.ShowInDirectory != request.ShowInDirectory)
            {
                student.ShowInDirectory = request.ShowInDirectory;
                await _studentRepository.UpdateAsync(student);
            }

            var profile = await _profileRepository.GetByStudentIdAsync(studentId);
            if (profile == null)
            {
                await _profileRepository.CreateAsync(new AlumniProfile
                {
                    StudentId = studentId,
                    Headline = request.Headline,
                    Bio = request.Bio,
                    Location = request.Location,
                    LinkedInUrl = request.LinkedInUrl,
                    Phone = request.Phone,
                    DateOfBirth = request.DateOfBirth,
                    Address = request.Address,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
            else
            {
                profile.Headline = request.Headline;
                profile.Bio = request.Bio;
                profile.Location = request.Location;
                profile.LinkedInUrl = request.LinkedInUrl;
                profile.Phone = request.Phone;
                profile.DateOfBirth = request.DateOfBirth;
                profile.Address = request.Address;
                profile.UpdatedAt = DateTime.UtcNow;
                await _profileRepository.UpdateAsync(profile);
            }

            await _activityLogRepository.LogStudentAsync(studentId, "UPDATE_PROFILE", "Student updated their profile", ipAddress);
            return true;
        }

        public async Task<string> UploadProfilePictureAsync(int studentId, string relativePath, string ipAddress)
        {
            var profile = await _profileRepository.GetByStudentIdAsync(studentId);

            if (profile == null)
            {
                await _profileRepository.CreateAsync(new AlumniProfile
                {
                    StudentId = studentId,
                    ProfilePicturePath = relativePath,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
            else
            {
                DeleteProfilePictureFile(profile.ProfilePicturePath);
                profile.ProfilePicturePath = relativePath;
                profile.UpdatedAt = DateTime.UtcNow;
                await _profileRepository.UpdateAsync(profile);
            }

            await _activityLogRepository.LogStudentAsync(studentId, "UPLOAD_PROFILE_PICTURE",
                "Student updated their profile picture", ipAddress);
            return relativePath;
        }

        public async Task<bool> DeleteProfilePictureAsync(int studentId, string ipAddress)
        {
            var profile = await _profileRepository.GetByStudentIdAsync(studentId);
            if (profile == null || string.IsNullOrWhiteSpace(profile.ProfilePicturePath))
                return false;

            DeleteProfilePictureFile(profile.ProfilePicturePath);
            profile.ProfilePicturePath = null;
            profile.UpdatedAt = DateTime.UtcNow;
            await _profileRepository.UpdateAsync(profile);

            await _activityLogRepository.LogStudentAsync(studentId, "DELETE_PROFILE_PICTURE",
                "Student removed their profile picture", ipAddress);
            return true;
        }

        private static void DeleteProfilePictureFile(string? oldPath)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(oldPath)) return;

                var normalized = oldPath.Replace('/', Path.DirectorySeparatorChar);
                var prefix = $"Uploads{Path.DirectorySeparatorChar}ProfilePictures{Path.DirectorySeparatorChar}";
                if (!normalized.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return;

                var fullPath = Path.Combine(Directory.GetCurrentDirectory(), normalized);
                if (System.IO.File.Exists(fullPath))
                    System.IO.File.Delete(fullPath);
            }
            catch
            {
                // Old-file cleanup must never fail the upload.
            }
        }

        public async Task<JobPreferenceDto?> GetJobPreferencesAsync(int studentId)
        {
            var preference = await _jobPreferenceRepository.GetByStudentIdAsync(studentId);
            if (preference == null) return null;

            return new JobPreferenceDto
            {
                PreferredJobTitle = preference.PreferredJobTitle,
                PreferredIndustry = preference.PreferredIndustry,
                PreferredLocation = preference.PreferredLocation,
                IsOpenToWork = preference.IsOpenToWork
            };
        }

        public async Task<bool> UpdateJobPreferencesAsync(int studentId, JobPreferenceDto request, string ipAddress)
        {
            var preference = await _jobPreferenceRepository.GetByStudentIdAsync(studentId);

            if (preference == null)
            {
                await _jobPreferenceRepository.CreateAsync(new JobPreference
                {
                    StudentId = studentId,
                    PreferredJobTitle = request.PreferredJobTitle,
                    PreferredIndustry = request.PreferredIndustry,
                    PreferredLocation = request.PreferredLocation,
                    IsOpenToWork = request.IsOpenToWork,
                    UpdatedAt = DateTime.UtcNow
                });
            }
            else
            {
                preference.PreferredJobTitle = request.PreferredJobTitle;
                preference.PreferredIndustry = request.PreferredIndustry;
                preference.PreferredLocation = request.PreferredLocation;
                preference.IsOpenToWork = request.IsOpenToWork;
                preference.UpdatedAt = DateTime.UtcNow;
                await _jobPreferenceRepository.UpdateAsync(preference);
            }

            await _activityLogRepository.LogStudentAsync(studentId, "UPDATE_JOB_PREFERENCES", "Student updated job preferences", ipAddress);
            return true;
        }
        public async Task AddWorkExperienceAsync(int studentId, WorkExperienceDto request, string ipAddress)
        {
            await _workExperienceRepository.CreateAsync(new WorkExperience
            {
                StudentId = studentId,
                JobTitle = request.JobTitle,
                Company = request.Company,
                Location = request.Location,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                Description = request.Description
            });
            await _activityLogRepository.LogStudentAsync(studentId, "ADD_WORK_EXPERIENCE", $"Added work experience at {request.Company}", ipAddress);
        }

        public async Task<bool> UpdateWorkExperienceAsync(int studentId, int workExperienceId, WorkExperienceDto request, string ipAddress)
        {
            var work = await _workExperienceRepository.GetByIdAsync(workExperienceId);
            if (work == null || work.StudentId != studentId) return false;

            work.JobTitle = request.JobTitle;
            work.Company = request.Company;
            work.Location = request.Location;
            work.StartDate = request.StartDate;
            work.EndDate = request.EndDate;
            work.Description = request.Description;
            await _workExperienceRepository.UpdateAsync(work);
            await _activityLogRepository.LogStudentAsync(studentId, "UPDATE_WORK_EXPERIENCE", $"Updated work experience at {request.Company}", ipAddress);
            return true;
        }

        public async Task<bool> DeleteWorkExperienceAsync(int studentId, int workExperienceId, string ipAddress)
        {
            var work = await _workExperienceRepository.GetByIdAsync(workExperienceId);
            if (work == null || work.StudentId != studentId) return false;
            await _workExperienceRepository.DeleteAsync(work);
            await _activityLogRepository.LogStudentAsync(studentId, "DELETE_WORK_EXPERIENCE", $"Deleted work experience at {work.Company}", ipAddress);
            return true;
        }

        public async Task AddEducationAsync(int studentId, EducationDto request, string ipAddress)
        {
            await _educationRepository.CreateAsync(new Education
            {
                StudentId = studentId,
                Degree = request.Degree,
                FieldOfStudy = request.FieldOfStudy,
                School = request.School,
                StartYear = request.StartYear,
                EndYear = request.EndYear
            });
            await _activityLogRepository.LogStudentAsync(studentId, "ADD_EDUCATION", $"Added education at {request.School}", ipAddress);
        }

        public async Task<bool> UpdateEducationAsync(int studentId, int educationId, EducationDto request, string ipAddress)
        {
            var education = await _educationRepository.GetByIdAsync(educationId);
            if (education == null || education.StudentId != studentId) return false;

            education.Degree = request.Degree;
            education.FieldOfStudy = request.FieldOfStudy;
            education.School = request.School;
            education.StartYear = request.StartYear;
            education.EndYear = request.EndYear;
            await _educationRepository.UpdateAsync(education);
            await _activityLogRepository.LogStudentAsync(studentId, "UPDATE_EDUCATION", $"Updated education at {request.School}", ipAddress);
            return true;
        }

        public async Task<bool> DeleteEducationAsync(int studentId, int educationId, string ipAddress)
        {
            var education = await _educationRepository.GetByIdAsync(educationId);
            if (education == null || education.StudentId != studentId) return false;
            await _educationRepository.DeleteAsync(education);
            await _activityLogRepository.LogStudentAsync(studentId, "DELETE_EDUCATION", $"Deleted education at {education.School}", ipAddress);
            return true;
        }

        public async Task UpdateSkillsAsync(int studentId, List<string> skills, string ipAddress)
        {
            await _skillRepository.DeleteAllByStudentIdAsync(studentId);
            foreach (var skill in skills)
            {
                await _skillRepository.CreateAsync(new Skill
                {
                    StudentId = studentId,
                    SkillName = skill
                });
            }
            await _activityLogRepository.LogStudentAsync(studentId, "UPDATE_SKILLS", $"Updated skills ({skills.Count} listed)", ipAddress);
        }
    }
}
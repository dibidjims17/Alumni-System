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

        public ProfileService(
            IAlumniProfileRepository profileRepository,
            IJobPreferenceRepository jobPreferenceRepository,
            IStudentRepository studentRepository,
            IActivityLogRepository activityLogRepository,
            IWorkExperienceRepository workExperienceRepository,
            IEducationRepository educationRepository,
            ISkillRepository skillRepository)
        {
            _profileRepository = profileRepository;
            _jobPreferenceRepository = jobPreferenceRepository;
            _studentRepository = studentRepository;
            _activityLogRepository = activityLogRepository;
            _workExperienceRepository = workExperienceRepository;
            _educationRepository = educationRepository;
            _skillRepository = skillRepository;
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

        public async Task<bool> UpdateWorkExperienceAsync(int studentId, int workExperienceId, WorkExperienceDto request)
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
            return true;
        }

        public async Task<bool> DeleteWorkExperienceAsync(int studentId, int workExperienceId)
        {
            var work = await _workExperienceRepository.GetByIdAsync(workExperienceId);
            if (work == null || work.StudentId != studentId) return false;
            await _workExperienceRepository.DeleteAsync(work);
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

        public async Task<bool> UpdateEducationAsync(int studentId, int educationId, EducationDto request)
        {
            var education = await _educationRepository.GetByIdAsync(educationId);
            if (education == null || education.StudentId != studentId) return false;

            education.Degree = request.Degree;
            education.FieldOfStudy = request.FieldOfStudy;
            education.School = request.School;
            education.StartYear = request.StartYear;
            education.EndYear = request.EndYear;
            await _educationRepository.UpdateAsync(education);
            return true;
        }

        public async Task<bool> DeleteEducationAsync(int studentId, int educationId)
        {
            var education = await _educationRepository.GetByIdAsync(educationId);
            if (education == null || education.StudentId != studentId) return false;
            await _educationRepository.DeleteAsync(education);
            return true;
        }

        public async Task UpdateSkillsAsync(int studentId, List<string> skills)
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
        }
    }
}
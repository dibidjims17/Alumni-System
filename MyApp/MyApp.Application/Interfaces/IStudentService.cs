using MyApp.Shared.DTOs;

namespace MyApp.Application.Interfaces
{
    public interface IStudentService
    {
        Task<List<StudentDto>> GetAllStudentsAsync();
        Task<ImportResultDto> ImportStudentsAsync(List<ImportStudentDto> students, int adminId);
        Task<bool> ToggleStudentStatusAsync(int studentId, int adminId);
        Task<(int Total, int Active, int Graduate)> GetStatsAsync();
        Task<bool> UpdateStudentAsync(int studentId, UpdateStudentRequest request, int adminId);
        Task<string?> ResetStudentPasswordAsync(int studentId, int adminId);
        Task<StudentDto?> CreateStudentAsync(CreateStudentRequest request, int adminId);
    }
}
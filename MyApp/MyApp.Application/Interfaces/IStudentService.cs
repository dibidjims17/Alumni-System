using MyApp.Shared.DTOs;

namespace MyApp.Application.Interfaces
{
    public interface IStudentService
    {
        Task<List<StudentDto>> GetAllStudentsAsync();
        Task<ImportResultDto> ImportStudentsAsync(List<ImportStudentDto> students, int adminId);
        Task<bool> ToggleStudentStatusAsync(int studentId, int adminId);
    }
}
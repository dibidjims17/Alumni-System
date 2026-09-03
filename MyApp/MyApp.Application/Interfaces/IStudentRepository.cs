using MyApp.Domain.Entities;

namespace MyApp.Application.Interfaces
{
    public interface IStudentRepository
    {
        Task<Student?> GetByStudentNumberAsync(string studentNumber);
        Task<Student?> GetByIdAsync(int id);
        Task<List<Student>> GetAllAsync();
        Task UpdateAsync(Student student);
        Task CreateAsync(Student student);
        Task<Student?> GetByEmailAsync(string email);
        Task<int> CountAllAsync();
        Task<int> CountActiveAsync();
        Task<int> CountGraduateAsync();
        Task<(List<Student> Items, int Total)> SearchDirectoryAsync(string? search, string? program, string? schoolYear, int page, int pageSize);
        Task<(List<string> Programs, List<string> SchoolYears)> GetDirectoryFilterValuesAsync();
    }
}
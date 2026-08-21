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
    }
}
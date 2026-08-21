using MyApp.Domain.Entities;

namespace MyApp.Application.Interfaces
{
    public interface IAlumniDocumentRepository
    {
        Task<List<AlumniDocument>> GetByStudentIdAsync(int studentId);
        Task<AlumniDocument?> GetByIdAsync(int id);
        Task CreateAsync(AlumniDocument document);
        Task UpdateAsync(AlumniDocument document);
        Task DeleteAsync(AlumniDocument document);
        Task<List<AlumniDocument>?> GetByStudentNumberAsync(string studentNumber);
    }
}
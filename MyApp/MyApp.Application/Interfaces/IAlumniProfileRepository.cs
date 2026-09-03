using MyApp.Domain.Entities;

namespace MyApp.Application.Interfaces
{
    public interface IAlumniProfileRepository
    {
        Task<AlumniProfile?> GetByStudentIdAsync(int studentId);
        Task<Dictionary<int, AlumniProfile>> GetByStudentIdsAsync(IEnumerable<int> studentIds);
        Task CreateAsync(AlumniProfile profile);
        Task UpdateAsync(AlumniProfile profile);
    }
}
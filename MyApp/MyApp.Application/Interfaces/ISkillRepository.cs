using MyApp.Domain.Entities;

namespace MyApp.Application.Interfaces
{
    public interface ISkillRepository
    {
        Task<List<Skill>> GetByStudentIdAsync(int studentId);
        Task CreateAsync(Skill skill);
        Task DeleteAsync(Skill skill);
        Task DeleteAllByStudentIdAsync(int studentId);
    }
}
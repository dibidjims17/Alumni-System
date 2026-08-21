using Microsoft.EntityFrameworkCore;
using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Infrastructure.Data;

namespace MyApp.Infrastructure.Repositories
{
    public class AlumniDocumentRepository : IAlumniDocumentRepository
    {
        private readonly AppDbContext _context;

        public AlumniDocumentRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<AlumniDocument>> GetByStudentIdAsync(int studentId)
        {
            return await _context.AlumniDocuments
                .Where(d => d.StudentId == studentId)
                .OrderBy(d => d.DocumentType)
                .ToListAsync();
        }

        public async Task<AlumniDocument?> GetByIdAsync(int id)
        {
            return await _context.AlumniDocuments.FirstOrDefaultAsync(d => d.Id == id);
        }

        public async Task CreateAsync(AlumniDocument document)
        {
            await _context.AlumniDocuments.AddAsync(document);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(AlumniDocument document)
        {
            _context.AlumniDocuments.Update(document);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(AlumniDocument document)
        {
            _context.AlumniDocuments.Remove(document);
            await _context.SaveChangesAsync();
        }

        public async Task<List<AlumniDocument>?> GetByStudentNumberAsync(string studentNumber)
        {
            var student = await _context.Students
                .FirstOrDefaultAsync(s => s.StudentNumber == studentNumber);

            if (student == null) return null;

            return await _context.AlumniDocuments
                .Where(d => d.StudentId == student.Id)
                .ToListAsync();
        }
    }
}
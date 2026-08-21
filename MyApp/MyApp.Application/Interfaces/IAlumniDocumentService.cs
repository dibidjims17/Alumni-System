using MyApp.Shared.DTOs;

namespace MyApp.Application.Interfaces
{
    public interface IAlumniDocumentService
    {
        Task<List<AlumniDocumentDto>> GetDocumentsAsync(int studentId);
        Task InitializeDocumentsAsync(int studentId, int adminId);
        Task<bool> UpdateStatusAsync(int documentId, UpdateDocumentStatusRequest request, int adminId);
        Task<bool> AddCustomDocumentAsync(int studentId, CreateDocumentRequest request, int adminId);
        Task<bool> DeleteDocumentAsync(int documentId, int adminId);
        Task<ImportResultDto> ImportDocumentStatusesAsync(List<ImportDocumentDto> documents, int adminId);
    }
}
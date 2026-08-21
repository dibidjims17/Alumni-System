using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Shared.DTOs;

namespace MyApp.Application.Services
{
    public class AlumniDocumentService : IAlumniDocumentService
    {
        private readonly IAlumniDocumentRepository _documentRepository;
        private readonly IActivityLogRepository _activityLogRepository;

        private static readonly List<string> StandardDocuments = new()
        {
            "Diploma",
            "Form 137",
            "Transcript of Records (TOR)",
            "Certificate of Graduation",
            "Honorable Dismissal",
            "Certificate of Good Moral Character"
        };

        public AlumniDocumentService(
            IAlumniDocumentRepository documentRepository,
            IActivityLogRepository activityLogRepository)
        {
            _documentRepository = documentRepository;
            _activityLogRepository = activityLogRepository;
        }

        public async Task<List<AlumniDocumentDto>> GetDocumentsAsync(int studentId)
        {
            var documents = await _documentRepository.GetByStudentIdAsync(studentId);
            return documents.Select(d => new AlumniDocumentDto
            {
                Id = d.Id,
                DocumentType = d.DocumentType,
                CustomLabel = d.CustomLabel,
                Status = d.Status,
                Notes = d.Notes,
                UpdatedAt = d.UpdatedAt
            }).ToList();
        }

        public async Task InitializeDocumentsAsync(int studentId, int adminId)
        {
            // Only initialize if no documents exist yet
            var existing = await _documentRepository.GetByStudentIdAsync(studentId);
            if (existing.Any()) return;

            foreach (var docType in StandardDocuments)
            {
                await _documentRepository.CreateAsync(new AlumniDocument
                {
                    StudentId = studentId,
                    DocumentType = docType,
                    Status = "Pending",
                    UpdatedAt = DateTime.UtcNow,
                    UpdatedByAdminId = adminId
                });
            }

            await _activityLogRepository.LogAdminAsync(adminId, "INIT_DOCUMENTS",
                $"Initialized document checklist for student {studentId}", "system");
        }

        public async Task<bool> UpdateStatusAsync(int documentId, UpdateDocumentStatusRequest request, int adminId)
        {
            var document = await _documentRepository.GetByIdAsync(documentId);
            if (document == null) return false;

            document.Status = request.Status;
            document.Notes = request.Notes;
            document.UpdatedAt = DateTime.UtcNow;
            document.UpdatedByAdminId = adminId;

            await _documentRepository.UpdateAsync(document);
            await _activityLogRepository.LogAdminAsync(adminId, "UPDATE_DOCUMENT_STATUS",
                $"Updated {document.DocumentType} to {request.Status}", "system");

            return true;
        }

        public async Task<bool> AddCustomDocumentAsync(int studentId, CreateDocumentRequest request, int adminId)
        {
            await _documentRepository.CreateAsync(new AlumniDocument
            {
                StudentId = studentId,
                DocumentType = request.DocumentType,
                CustomLabel = request.CustomLabel,
                Status = "Pending",
                UpdatedAt = DateTime.UtcNow,
                UpdatedByAdminId = adminId
            });

            await _activityLogRepository.LogAdminAsync(adminId, "ADD_DOCUMENT",
                $"Added document {request.DocumentType} for student {studentId}", "system");

            return true;
        }

        public async Task<bool> DeleteDocumentAsync(int documentId, int adminId)
        {
            var document = await _documentRepository.GetByIdAsync(documentId);
            if (document == null) return false;

            await _documentRepository.DeleteAsync(document);
            await _activityLogRepository.LogAdminAsync(adminId, "DELETE_DOCUMENT",
                $"Deleted document {document.DocumentType}", "system");

            return true;
        }

        public async Task<ImportResultDto> ImportDocumentStatusesAsync(List<ImportDocumentDto> documents, int adminId)
        {
            var result = new ImportResultDto();

            foreach (var dto in documents)
            {
                try
                {
                    // Validate status
                    if (dto.Status != "Released" && dto.Status != "Pending")
                    {
                        result.Errors++;
                        result.ErrorMessages.Add($"Invalid status '{dto.Status}' for {dto.StudentNumber} — {dto.DocumentType}. Use 'Released' or 'Pending'.");
                        continue;
                    }

                    // Find student
                    var studentDocs = await _documentRepository.GetByStudentNumberAsync(dto.StudentNumber);
                    if (studentDocs == null)
                    {
                        result.Errors++;
                        result.ErrorMessages.Add($"Student not found: {dto.StudentNumber}");
                        continue;
                    }

                    // Find matching document
                    var document = studentDocs.FirstOrDefault(d =>
                        d.DocumentType.Equals(dto.DocumentType.Trim(), StringComparison.OrdinalIgnoreCase) ||
                        (d.CustomLabel != null && d.CustomLabel.Equals(dto.DocumentType.Trim(), StringComparison.OrdinalIgnoreCase)));

                    if (document == null)
                    {
                        result.Errors++;
                        result.ErrorMessages.Add($"Document '{dto.DocumentType}' not found for student {dto.StudentNumber}");
                        continue;
                    }

                    document.Status = dto.Status;
                    document.Notes = dto.Notes;
                    document.UpdatedAt = DateTime.UtcNow;
                    document.UpdatedByAdminId = adminId;

                    await _documentRepository.UpdateAsync(document);
                    result.Imported++;
                }
                catch (Exception ex)
                {
                    result.Errors++;
                    result.ErrorMessages.Add($"Error processing {dto.StudentNumber} — {dto.DocumentType}: {ex.Message}");
                }
            }

            await _activityLogRepository.LogAdminAsync(adminId, "IMPORT_DOCUMENT_STATUSES",
                $"Updated {result.Imported} documents, {result.Errors} errors", "system");

            return result;
        }        
    }
}
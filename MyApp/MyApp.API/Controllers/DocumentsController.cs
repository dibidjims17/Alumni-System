using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyApp.Application.Interfaces;
using MyApp.Shared.DTOs;

namespace MyApp.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DocumentsController : ControllerBase
    {
        private readonly IAlumniDocumentService _documentService;

        public DocumentsController(IAlumniDocumentService documentService)
        {
            _documentService = documentService;
        }

        private int GetUserId() =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // Alumni views their own documents
        [HttpGet("my-documents")]
        public async Task<IActionResult> GetMyDocuments()
        {
            var result = await _documentService.GetDocumentsAsync(GetUserId());
            return Ok(result);
        }

        // Admin views a specific student's documents
        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpGet("student/{studentId}")]
        public async Task<IActionResult> GetStudentDocuments(int studentId)
        {
            var result = await _documentService.GetDocumentsAsync(studentId);
            return Ok(result);
        }

        // Admin initializes the standard document checklist for a student
        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpPost("student/{studentId}/initialize")]
        public async Task<IActionResult> InitializeDocuments(int studentId)
        {
            await _documentService.InitializeDocumentsAsync(studentId, GetUserId());
            return Ok(new { message = "Documents initialized." });
        }

        // Admin updates document status
        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpPut("{documentId}/status")]
        public async Task<IActionResult> UpdateStatus(int documentId, [FromBody] UpdateDocumentStatusRequest request)
        {
            var success = await _documentService.UpdateStatusAsync(documentId, request, GetUserId());
            if (!success) return NotFound();
            return Ok(new { message = "Document status updated." });
        }

        // Admin adds custom document
        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpPost("student/{studentId}/custom")]
        public async Task<IActionResult> AddCustomDocument(int studentId, [FromBody] CreateDocumentRequest request)
        {
            await _documentService.AddCustomDocumentAsync(studentId, request, GetUserId());
            return Ok(new { message = "Custom document added." });
        }

        // Admin deletes a document
        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpDelete("{documentId}")]
        public async Task<IActionResult> DeleteDocument(int documentId)
        {
            var success = await _documentService.DeleteDocumentAsync(documentId, GetUserId());
            if (!success) return NotFound();
            return Ok(new { message = "Document deleted." });
        }

        [Authorize(Roles = "SuperAdmin,Staff")]
        [HttpPost("import")]
        public async Task<IActionResult> ImportDocumentStatuses([FromBody] List<ImportDocumentDto> documents)
        {
            var result = await _documentService.ImportDocumentStatusesAsync(documents, GetUserId());
            return Ok(result);
        }
    }
}
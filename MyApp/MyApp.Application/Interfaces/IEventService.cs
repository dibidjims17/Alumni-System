using MyApp.Shared.DTOs;

namespace MyApp.Application.Interfaces
{
    public interface IEventService
    {
        Task<(List<EventDto> Items, int TotalCount)> GetUpcomingEventsAsync(int page, int pageSize, int studentId, string? search = null);
        Task<(List<EventDto> Items, int TotalCount)> GetAllEventsAsync(int page, int pageSize, string? search = null);
        Task<EventDto?> GetEventAsync(int eventId, int? studentId);
        Task<EventDto> CreateEventAsync(CreateEventRequest request, int adminId);
        Task<bool> UpdateEventAsync(int eventId, CreateEventRequest request, int adminId);
        Task<bool> SoftDeleteEventAsync(int eventId, int adminId);
        Task<bool> RestoreEventAsync(int eventId, int adminId);
        Task<bool> PermanentlyDeleteEventAsync(int eventId, int adminId);
        Task<List<EventDto>> GetDeletedEventsAsync();
        Task<(bool Found, bool Rsvped)> ToggleRsvpAsync(int eventId, int studentId, string ipAddress);
        Task<List<EventAttendeeDto>?> GetAttendeesAsync(int eventId);
    }
}

using MyApp.Domain.Entities;

namespace MyApp.Application.Interfaces
{
    public interface IEventRepository
    {
        Task<List<Event>> GetUpcomingAsync(int page, int pageSize, string? search = null);
        Task<int> CountUpcomingAsync(string? search = null);
        Task<List<Event>> GetAllAsync(int page, int pageSize);
        Task<int> CountAllAsync();
        Task<Event?> GetByIdAsync(int id);
        Task<EventRsvp?> GetRsvpAsync(int eventId, int studentId);
        Task AddRsvpAsync(EventRsvp rsvp);
        Task RemoveRsvpAsync(EventRsvp rsvp);
        Task<List<EventRsvp>> GetRsvpsByEventAsync(int eventId);
        Task CreateAsync(Event eventEntity);
        Task UpdateAsync(Event eventEntity);
        Task DeleteAsync(Event eventEntity);
    }
}

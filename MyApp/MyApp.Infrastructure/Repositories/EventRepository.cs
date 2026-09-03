using Microsoft.EntityFrameworkCore;
using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Infrastructure.Data;

namespace MyApp.Infrastructure.Repositories
{
    public class EventRepository : IEventRepository
    {
        private readonly AppDbContext _context;

        public EventRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<Event>> GetUpcomingAsync(int page, int pageSize)
        {
            return await _context.Events
                .Where(e => e.EventDate >= DateTime.UtcNow)
                .Include(e => e.PostedByAdmin)
                .Include(e => e.Rsvps)
                .OrderBy(e => e.EventDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<int> CountUpcomingAsync()
        {
            return await _context.Events.CountAsync(e => e.EventDate >= DateTime.UtcNow);
        }

        public async Task<List<Event>> GetAllAsync(int page, int pageSize)
        {
            return await _context.Events
                .Include(e => e.PostedByAdmin)
                .Include(e => e.Rsvps)
                .OrderByDescending(e => e.EventDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }

        public async Task<int> CountAllAsync()
        {
            return await _context.Events.CountAsync();
        }

        public async Task<Event?> GetByIdAsync(int id)
        {
            return await _context.Events
                .Include(e => e.PostedByAdmin)
                .Include(e => e.Rsvps)
                .FirstOrDefaultAsync(e => e.Id == id);
        }

        public async Task<EventRsvp?> GetRsvpAsync(int eventId, int studentId)
        {
            return await _context.EventRsvps
                .FirstOrDefaultAsync(r => r.EventId == eventId && r.StudentId == studentId);
        }

        public async Task AddRsvpAsync(EventRsvp rsvp)
        {
            await _context.EventRsvps.AddAsync(rsvp);
            await _context.SaveChangesAsync();
        }

        public async Task RemoveRsvpAsync(EventRsvp rsvp)
        {
            _context.EventRsvps.Remove(rsvp);
            await _context.SaveChangesAsync();
        }

        public async Task<List<EventRsvp>> GetRsvpsByEventAsync(int eventId)
        {
            return await _context.EventRsvps
                .Where(r => r.EventId == eventId)
                .Include(r => r.Student)
                .OrderBy(r => r.CreatedAt)
                .ToListAsync();
        }

        public async Task CreateAsync(Event eventEntity)
        {
            await _context.Events.AddAsync(eventEntity);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(Event eventEntity)
        {
            _context.Events.Update(eventEntity);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Event eventEntity)
        {
            _context.Events.Remove(eventEntity);
            await _context.SaveChangesAsync();
        }
    }
}

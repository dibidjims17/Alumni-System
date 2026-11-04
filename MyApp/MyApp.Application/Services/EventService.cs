using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Shared.DTOs;

namespace MyApp.Application.Services
{
    public class EventService : IEventService
    {
        private readonly IEventRepository _eventRepository;
        private readonly IActivityLogRepository _activityLogRepository;
        private readonly INotificationService _notificationService;

        public EventService(
            IEventRepository eventRepository,
            IActivityLogRepository activityLogRepository,
            INotificationService notificationService)
        {
            _eventRepository = eventRepository;
            _activityLogRepository = activityLogRepository;
            _notificationService = notificationService;
        }

        public async Task<(List<EventDto> Items, int TotalCount)> GetUpcomingEventsAsync(int page, int pageSize, int studentId, string? search = null)
        {
            var events = await _eventRepository.GetUpcomingAsync(page, pageSize, search);
            var total = await _eventRepository.CountUpcomingAsync(search);
            var items = events.Select(e => Map(e, studentId)).ToList();
            return (items, total);
        }

        public async Task<(List<EventDto> Items, int TotalCount)> GetAllEventsAsync(int page, int pageSize, string? search = null, string? status = null)
        {
            var events = await _eventRepository.GetAllAsync(page, pageSize, search, status);
            var total = await _eventRepository.CountAllAsync(search, status);
            var items = events.Select(e => Map(e, null)).ToList();
            return (items, total);
        }

        public async Task<EventDto?> GetEventAsync(int eventId, int? studentId)
        {
            var eventEntity = await _eventRepository.GetByIdAsync(eventId);
            if (eventEntity == null) return null;

            // A guessed id must not leak drafts or not-yet-due schedules to
            // alumni. Admin lists use GetAllEventsAsync and still see both.
            if (studentId.HasValue && !IsVisible(eventEntity)) return null;

            return Map(eventEntity, studentId);
        }

        public async Task<EventDto> CreateEventAsync(CreateEventRequest request, int adminId, string? imagePath)
        {
            var publishAt = NormalizePublishAt(request.IsPublished, request.PublishAt);

            var eventEntity = new Event
            {
                Title = request.Title,
                Description = request.Description,
                Location = request.Location,
                EventDate = request.EventDate!.Value,
                ImagePath = imagePath,
                IsPublished = request.IsPublished,
                PublishAt = publishAt,
                PostedByAdminId = adminId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _eventRepository.CreateAsync(eventEntity);
            await _activityLogRepository.LogAdminAsync(adminId, "CREATE_EVENT",
                $"Created event: {request.Title}", "system");

            // Drafts and future schedules stay quiet. The hosted publisher
            // announces scheduled events when they actually go live.
            if (IsVisible(eventEntity) && eventEntity.EventDate >= DateTime.UtcNow)
                await _notificationService.NotifyEventPostedAsync(request.Title, eventEntity.Id);

            return Map(eventEntity, null);
        }

        public async Task<bool> UpdateEventAsync(int eventId, CreateEventRequest request, int adminId, string? imagePath)
        {
            var eventEntity = await _eventRepository.GetByIdAsync(eventId);
            if (eventEntity == null) return false;

            var wasVisible = IsVisible(eventEntity);

            eventEntity.Title = request.Title;
            eventEntity.Description = request.Description;
            eventEntity.Location = request.Location;
            eventEntity.EventDate = request.EventDate!.Value;
            eventEntity.IsPublished = request.IsPublished;
            eventEntity.PublishAt = NormalizePublishAt(request.IsPublished, request.PublishAt);
            eventEntity.UpdatedAt = DateTime.UtcNow;
            if (request.RemoveImage) eventEntity.ImagePath = null;
            else if (imagePath != null) eventEntity.ImagePath = imagePath;

            await _eventRepository.UpdateAsync(eventEntity);
            await _activityLogRepository.LogAdminAsync(adminId, "UPDATE_EVENT", $"Updated event: {request.Title}", "system");

            // Draft -> published and scheduled -> publish-now transitions get
            // the same announcement as a newly published event.
            if (!wasVisible && IsVisible(eventEntity) && eventEntity.EventDate >= DateTime.UtcNow)
                await _notificationService.NotifyEventPostedAsync(eventEntity.Title, eventEntity.Id);

            return true;
        }

        // Promotes and announces due schedules without waiting for somebody to
        // open the app. EventPublishHostedService invokes this every 30s.
        public async Task PublishDueEventsAsync()
        {
            var due = await _eventRepository.GetDueScheduledAsync();

            foreach (var eventEntity in due)
            {
                // Clear BEFORE announcing so the row cannot match again after
                // a crash; at worst one notification is lost, never repeated.
                eventEntity.PublishAt = null;
                eventEntity.UpdatedAt = DateTime.UtcNow;
                await _eventRepository.UpdateAsync(eventEntity);

                await _activityLogRepository.LogAdminAsync(eventEntity.PostedByAdminId, "PUBLISH_EVENT",
                    $"Published scheduled event: {eventEntity.Title}", "system");

                // If the process/tick was delayed until after the event, do
                // not send alumni a stale "New Event" notification.
                if (eventEntity.EventDate >= DateTime.UtcNow)
                    await _notificationService.NotifyEventPostedAsync(eventEntity.Title, eventEntity.Id);
            }
        }

        public async Task<bool> SoftDeleteEventAsync(int eventId, int adminId)
        {
            var eventEntity = await _eventRepository.GetByIdAsync(eventId);
            if (eventEntity == null) return false;

            eventEntity.IsDeleted = true;
            await _eventRepository.UpdateAsync(eventEntity);
            await _activityLogRepository.LogAdminAsync(adminId, "TRASH_EVENT", $"Moved event to trash: {eventEntity.Title}", "system");
            return true;
        }

        public async Task<bool> RestoreEventAsync(int eventId, int adminId)
        {
            var eventEntity = await _eventRepository.GetByIdIncludingDeletedAsync(eventId);
            if (eventEntity == null || !eventEntity.IsDeleted) return false;

            eventEntity.IsDeleted = false;
            await _eventRepository.UpdateAsync(eventEntity);
            await _activityLogRepository.LogAdminAsync(adminId, "RESTORE_EVENT", $"Restored event: {eventEntity.Title}", "system");
            return true;
        }

        public async Task<bool> PermanentlyDeleteEventAsync(int eventId, int adminId)
        {
            var eventEntity = await _eventRepository.GetByIdIncludingDeletedAsync(eventId);
            if (eventEntity == null) return false;

            await _eventRepository.DeleteAsync(eventEntity);
            await _activityLogRepository.LogAdminAsync(adminId, "DELETE_EVENT", $"Permanently deleted event: {eventEntity.Title}", "system");
            return true;
        }

        public async Task<List<EventDto>> GetDeletedEventsAsync()
        {
            var events = await _eventRepository.GetDeletedAsync();
            return events.Select(e => Map(e, null)).ToList();
        }

        public async Task<(bool Found, bool Rsvped)> ToggleRsvpAsync(int eventId, int studentId, string ipAddress)
        {
            var eventEntity = await _eventRepository.GetByIdAsync(eventId);
            if (eventEntity == null || !IsVisible(eventEntity)) return (false, false);

            var existing = await _eventRepository.GetRsvpAsync(eventId, studentId);
            if (existing != null)
            {
                await _eventRepository.RemoveRsvpAsync(existing);
                await _activityLogRepository.LogStudentAsync(studentId, "CANCEL_RSVP", $"Cancelled RSVP for event: {eventEntity.Title}", ipAddress);
                return (true, false);
            }

            await _eventRepository.AddRsvpAsync(new EventRsvp
            {
                EventId = eventId,
                StudentId = studentId,
                CreatedAt = DateTime.UtcNow
            });
            await _activityLogRepository.LogStudentAsync(studentId, "RSVP_EVENT", $"RSVPed for event: {eventEntity.Title}", ipAddress);

            return (true, true);
        }

        public async Task<List<EventAttendeeDto>?> GetAttendeesAsync(int eventId)
        {
            var eventEntity = await _eventRepository.GetByIdAsync(eventId);
            if (eventEntity == null) return null;

            var rsvps = await _eventRepository.GetRsvpsByEventAsync(eventId);
            return rsvps.Select(r => new EventAttendeeDto
            {
                Id = r.Id,
                StudentId = r.StudentId,
                FullName = r.Student.FullName,
                StudentNumber = r.Student.StudentNumber,
                Program = r.Student.Program,
                SchoolYear = r.Student.SchoolYear,
                RsvpedAt = r.CreatedAt
            }).ToList();
        }

        private static EventDto Map(Event eventEntity, int? studentId)
        {
            return new EventDto
            {
                Id = eventEntity.Id,
                Title = eventEntity.Title,
                Description = eventEntity.Description,
                Location = eventEntity.Location,
                EventDate = eventEntity.EventDate,
                ImagePath = NormalizeImageUrl(eventEntity.ImagePath),
                IsPublished = eventEntity.IsPublished,
                PublishAt = eventEntity.PublishAt,
                PostedByAdminName = eventEntity.PostedByAdmin?.FullName ?? string.Empty,
                PostedByAdminPicture = eventEntity.PostedByAdmin?.ProfilePicturePath,
                AttendeeCount = eventEntity.Rsvps?.Count ?? 0,
                IsRsvped = studentId.HasValue && (eventEntity.Rsvps?.Any(r => r.StudentId == studentId.Value) ?? false),
                CreatedAt = eventEntity.CreatedAt
            };
        }

        private static bool IsVisible(Event eventEntity) =>
            !eventEntity.IsDeleted &&
            eventEntity.IsPublished &&
            (eventEntity.PublishAt == null || eventEntity.PublishAt <= DateTime.UtcNow);

        // Due/past means "publish now". Keeping non-null PublishAt synonymous
        // with "still waiting" prevents save and timer paths from both
        // announcing the same event.
        private static DateTime? NormalizePublishAt(bool isPublished, DateTime? publishAt)
        {
            if (!isPublished || publishAt == null) return null;
            return publishAt > DateTime.UtcNow ? publishAt : null;
        }

        // Legacy rows stored absolute server paths; clients only ever want the
        // relative "Uploads/..." form so they can prefix their own file root.
        private static string? NormalizeImageUrl(string? path)
        {
            if (string.IsNullOrWhiteSpace(path)) return null;

            var normalized = path.Replace('\\', '/').TrimStart('/');
            var marker = "Uploads/";
            var index = normalized.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
            return index >= 0 ? normalized.Substring(index) : normalized;
        }
    }
}

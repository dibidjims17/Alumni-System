using Microsoft.EntityFrameworkCore;
using MyApp.Domain.Entities;

namespace MyApp.Infrastructure.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Student> Students { get; set; }
        public DbSet<AlumniProfile> AlumniProfiles { get; set; }
        public DbSet<WorkExperience> WorkExperiences { get; set; }
        public DbSet<Education> Educations { get; set; }
        public DbSet<Skill> Skills { get; set; }
        public DbSet<JobPreference> JobPreferences { get; set; }
        public DbSet<Resume> Resumes { get; set; }
        public DbSet<ActivityLog> ActivityLogs { get; set; }
        public DbSet<Admin> Admins { get; set; }
        public DbSet<News> News { get; set; }
        public DbSet<NewsComment> NewsComments { get; set; }
        public DbSet<NewsHeart> NewsHearts { get; set; }
        public DbSet<Job> Jobs { get; set; }
        public DbSet<JobApplication> JobApplications { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<AlumniDocument> AlumniDocuments { get; set; }
        public DbSet<NewsCommentLike> NewsCommentLikes { get; set; }
        public DbSet<Event> Events { get; set; }
        public DbSet<EventRsvp> EventRsvps { get; set; }
        public DbSet<JobApplicationHistory> JobApplicationHistory { get; set; }
        public DbSet<PushToken> PushTokens { get; set; }
        public DbSet<YearLevelChangeRequest> YearLevelChangeRequests { get; set; }
        public DbSet<CareerRecord> CareerRecords { get; set; }
        public DbSet<TracerResponse> TracerResponses { get; set; }
        public DbSet<NewsSuggestion> NewsSuggestions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Soft-delete global filters: queries never return deleted rows unless
            // the repository explicitly opts out with IgnoreQueryFilters().
            modelBuilder.Entity<Job>().HasQueryFilter(j => !j.IsDeleted);
            modelBuilder.Entity<News>().HasQueryFilter(n => !n.IsDeleted);
            modelBuilder.Entity<Event>().HasQueryFilter(e => !e.IsDeleted);

            // A student can RSVP to a given event only once.
            modelBuilder.Entity<EventRsvp>()
                .HasIndex(r => new { r.EventId, r.StudentId })
                .IsUnique();

            // One row per device push token.
            modelBuilder.Entity<PushToken>()
                .HasIndex(p => p.Token)
                .IsUnique();

            // One tracer questionnaire per student — the pre-screening gate
            // is a single draft that flips to Submitted, never a history.
            modelBuilder.Entity<TracerResponse>()
                .HasIndex(r => r.StudentId)
                .IsUnique();

            // Post suggestions: a submitter always exists (cascade), while
            // the reviewer and the published post disappear safely if the
            // admin account or the News row is removed (set null).
            modelBuilder.Entity<NewsSuggestion>()
                .HasOne(s => s.Student)
                .WithMany()
                .HasForeignKey(s => s.StudentId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<NewsSuggestion>()
                .HasOne(s => s.ReviewedByAdmin)
                .WithMany()
                .HasForeignKey(s => s.ReviewedByAdminId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<NewsSuggestion>()
                .HasOne(s => s.News)
                .WithMany()
                .HasForeignKey(s => s.NewsId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<NewsSuggestion>()
                .HasIndex(s => s.StudentId);
        }
    }
}
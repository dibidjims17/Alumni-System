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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Soft-delete global filters: queries never return deleted rows unless
            // the repository explicitly opts out with IgnoreQueryFilters().
            modelBuilder.Entity<Job>().HasQueryFilter(j => !j.IsDeleted);
            modelBuilder.Entity<News>().HasQueryFilter(n => !n.IsDeleted);

            // A student can RSVP to a given event only once.
            modelBuilder.Entity<EventRsvp>()
                .HasIndex(r => new { r.EventId, r.StudentId })
                .IsUnique();
        }
    }
}
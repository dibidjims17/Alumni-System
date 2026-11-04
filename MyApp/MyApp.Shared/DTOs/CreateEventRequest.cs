using System.ComponentModel.DataAnnotations;

namespace MyApp.Shared.DTOs
{
    public class CreateEventRequest : IValidatableObject
    {
        [Required(AllowEmptyStrings = false)]
        public string Title { get; set; } = string.Empty;

        [Required(AllowEmptyStrings = false)]
        public string Description { get; set; } = string.Empty;

        [Required(AllowEmptyStrings = false)]
        public string Location { get; set; } = string.Empty;

        [Required]
        public DateTime? EventDate { get; set; }

        public bool IsPublished { get; set; } = true;

        // Null = publish immediately. A future value schedules when alumni
        // can first see the event; this is distinct from EventDate.
        public DateTime? PublishAt { get; set; }

        // Clears any stored flyer (the admin drop zone's Remove action).
        public bool RemoveImage { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            // A past PublishAt is intentionally allowed and is normalised to
            // "publish now", matching News. But a genuinely scheduled event
            // must become visible before it takes place.
            if (IsPublished && PublishAt.HasValue && EventDate.HasValue &&
                PublishAt.Value > DateTime.UtcNow && PublishAt.Value >= EventDate.Value)
            {
                yield return new ValidationResult(
                    "Publish time must be before the event date and time.",
                    new[] { nameof(PublishAt) });
            }
        }
    }
}

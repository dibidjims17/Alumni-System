using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace MyApp.API.Json
{
    // Every timestamp in this database is UTC: the services write
    // DateTime.UtcNow, the frontends send toISOString(), and queries compare
    // against UtcNow (EventRepository filters on `EventDate >= DateTime.UtcNow`).
    //
    // MySQL's `datetime` column has no timezone, so values read back carry
    // DateTimeKind.Unspecified — and System.Text.Json writes those with no
    // offset at all. JavaScript then reads "2026-11-05T06:45:00" as *local*
    // time, which on a UTC+8 machine renders 8 hours early. It is not merely
    // cosmetic: the admin forms round-trip a naive string back through
    // toISOString(), so every edit-save of an event or a schedule shifted the
    // stored instant 8 hours backwards.
    //
    // These converters close that gap by asserting Unspecified means UTC and
    // always emitting a trailing "Z", so `new Date(...)` in the browser and in
    // React Native lands on the intended instant.
    public sealed class UtcDateTimeConverter : JsonConverter<DateTime>
    {
        // Read deliberately mirrors the built-in converter (RoundtripKind:
        // trailing "Z" → Utc, an offset → Local, no zone → Unspecified) so
        // inbound payloads behave exactly as they always have. Only the write
        // side changes.
        public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            var text = reader.GetString();
            if (text is null) throw new JsonException("Expected a date string.");

            return DateTime.Parse(text, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind);
        }

        public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
        {
            writer.WriteStringValue(Format(value));
        }

        // Shared with the nullable converter below.
        internal static string Format(DateTime value)
        {
            var utc = value.Kind switch
            {
                DateTimeKind.Utc => value,
                DateTimeKind.Local => value.ToUniversalTime(),
                // From the database: a UTC instant with the zone stripped off.
                _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
            };

            // "FFFFFFF" keeps up to 7 fraction digits and trims trailing
            // zeros, which is the same shape System.Text.Json already
            // produced — we only append the "Z" it was omitting.
            var text = utc.ToString("yyyy-MM-ddTHH:mm:ss.FFFFFFF", CultureInfo.InvariantCulture);
            return text + "Z";
        }
    }

    // Nullable<DateTime> (PublishAt, EventDate, Deadline, …) is resolved
    // separately by System.Text.Json, so it is registered explicitly rather
    // than relying on the wrapper it may or may not pick for a custom
    // converter.
    public sealed class UtcNullableDateTimeConverter : JsonConverter<DateTime?>
    {
        public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Null) return null;

            var text = reader.GetString();
            if (text is null) throw new JsonException("Expected a date string.");

            return DateTime.Parse(text, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind);
        }

        public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
        {
            if (value is null) writer.WriteNullValue();
            else writer.WriteStringValue(UtcDateTimeConverter.Format(value.Value));
        }
    }
}

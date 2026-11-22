using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using MyApp.API.Security;
using MyApp.Application.Interfaces;
using MyApp.Application.Services;
using MyApp.Domain.Entities;
using MyApp.Infrastructure.Data;
using MyApp.Infrastructure.Repositories;

var builder = WebApplication.CreateBuilder(args);

// Do not disclose Kestrel in the Server response header.
builder.WebHost.ConfigureKestrel(options => options.AddServerHeader = false);

// Optional Cloudflare Worker origin gate. It stays disabled locally and is
// enabled in production only after the Worker has the same secret.
var cloudflareOptions = builder.Configuration
    .GetSection(CloudflareOriginOptions.SectionName)
    .Get<CloudflareOriginOptions>() ?? new CloudflareOriginOptions();
if (cloudflareOptions.RequireOriginSecret &&
    Encoding.UTF8.GetByteCount(cloudflareOptions.OriginSecret) < 32)
{
    throw new InvalidOperationException(
        "Cloudflare origin protection requires a random secret of at least 32 bytes. " +
        "Set Cloudflare__OriginSecret before enabling Cloudflare__RequireOriginSecret.");
}
builder.Services.AddSingleton(cloudflareOptions);

// MySQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

// Repositories
builder.Services.AddScoped<IStudentRepository, StudentRepository>();
builder.Services.AddScoped<IActivityLogRepository, ActivityLogRepository>();
builder.Services.AddScoped<IAlumniProfileRepository, AlumniProfileRepository>();
builder.Services.AddScoped<IJobPreferenceRepository, JobPreferenceRepository>();
builder.Services.AddScoped<IResumeRepository, ResumeRepository>();
builder.Services.AddScoped<IAdminRepository, AdminRepository>();
builder.Services.AddScoped<INewsRepository, NewsRepository>();
builder.Services.AddScoped<IWorkExperienceRepository, WorkExperienceRepository>();
builder.Services.AddScoped<IEducationRepository, EducationRepository>();
builder.Services.AddScoped<ISkillRepository, SkillRepository>();
builder.Services.AddScoped<IJobRepository, JobRepository>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<IAlumniDocumentRepository, AlumniDocumentRepository>();
builder.Services.AddScoped<IEventRepository, EventRepository>();
builder.Services.AddScoped<IPushTokenRepository, PushTokenRepository>();
builder.Services.AddScoped<IYearLevelChangeRepository, YearLevelChangeRepository>();
builder.Services.AddScoped<ICareerRepository, CareerRepository>();
builder.Services.AddScoped<ITracerRepository, TracerRepository>();
builder.Services.AddScoped<INewsSuggestionRepository, NewsSuggestionRepository>();

// Services
builder.Services.AddHttpClient<MyApp.Application.Services.GoogleTokenValidator>();
builder.Services.AddScoped<MyApp.Application.Services.GoogleTokenValidator>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IProfileService, ProfileService>();
builder.Services.AddScoped<IResumeService, ResumeService>();
builder.Services.AddScoped<IAdminAuthService, AdminAuthService>();
builder.Services.AddScoped<IAdminManagementService, AdminManagementService>();
builder.Services.AddScoped<INewsService, NewsService>();
builder.Services.AddScoped<IJobService, JobService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddHttpClient<IEmailService, MyApp.Infrastructure.Notifications.EmailService>();
builder.Services.AddScoped<IStudentService, StudentService>();
builder.Services.AddScoped<IAlumniDocumentService, AlumniDocumentService>();
builder.Services.AddScoped<IEventService, EventService>();
builder.Services.AddScoped<IDirectoryService, DirectoryService>();
builder.Services.AddScoped<ISuggestionsService, SuggestionsService>();
builder.Services.AddScoped<ICareerService, CareerService>();
builder.Services.AddScoped<ITracerService, TracerService>();
builder.Services.AddScoped<INewsSuggestionService, NewsSuggestionService>();
builder.Services.AddHttpClient<MyApp.Infrastructure.Services.PushService>();
builder.Services.AddScoped<IPushService>(sp =>
    sp.GetRequiredService<MyApp.Infrastructure.Services.PushService>());

// Time-gated content: promote due News and Events (and announce them) on a timer.
builder.Services.AddHostedService<MyApp.API.Services.NewsPublishHostedService>();
builder.Services.AddHostedService<MyApp.API.Services.EventPublishHostedService>();

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey)
    || Encoding.UTF8.GetByteCount(jwtKey) < 32
    || jwtKey == "YourSuperSecretKeyThatIsAtLeast32CharactersLong!")
{
    throw new InvalidOperationException(
        "Jwt:Key is missing, shorter than 32 bytes, or still the known default value. " +
        "Set a fresh random secret via the Jwt__Key environment variable or in appsettings.json.");
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

// Rate limiting for anonymous, brute-force-prone auth endpoints
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 5,
                QueueLimit = 0,
                Window = TimeSpan.FromMinutes(1)
            }));
});

// Every stored timestamp is UTC (MySQL `datetime` carries no zone, so values
// read back as Kind=Unspecified). Without an explicit "Z" the browser and
// React Native read naive strings as *local* time and render them 8 hours
// early on a UTC+8 machine — and edit forms round-trip that skew back into
// the database. See Json/UtcDateTimeConverter.cs.
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Converters.Add(new MyApp.API.Json.UtcDateTimeConverter());
    options.JsonSerializerOptions.Converters.Add(new MyApp.API.Json.UtcNullableDateTimeConverter());
});
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter: Bearer {your token}"
    });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

var allowedOrigins = (builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? [])
    .Select(origin => origin.Trim().TrimEnd('/'))
    .Where(origin => Uri.TryCreate(origin, UriKind.Absolute, out var uri) &&
                     (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

if (allowedOrigins.Length == 0)
    allowedOrigins = ["http://localhost:5173"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowedClients", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Railway (and other container hosts) starts with an empty managed database.
// Migrations and the one-time first admin are opt-in environment settings, so
// local development and established production databases remain untouched.
var migrateOnStartup = builder.Configuration.GetValue<bool>("Database:MigrateOnStartup");
var bootstrapAdmin = builder.Configuration.GetValue<bool>("BootstrapAdmin:Enabled");
if (migrateOnStartup || bootstrapAdmin)
{
    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    if (migrateOnStartup)
    {
        app.Logger.LogInformation("Applying pending database migrations.");
        await db.Database.MigrateAsync();
    }

    if (bootstrapAdmin)
    {
        var username = (builder.Configuration["BootstrapAdmin:Username"] ?? string.Empty).Trim();
        var fullName = (builder.Configuration["BootstrapAdmin:FullName"] ?? string.Empty).Trim();
        var email = (builder.Configuration["BootstrapAdmin:Email"] ?? string.Empty).Trim();
        var password = builder.Configuration["BootstrapAdmin:Password"] ?? string.Empty;

        if (string.IsNullOrWhiteSpace(username) ||
            string.IsNullOrWhiteSpace(fullName) ||
            string.IsNullOrWhiteSpace(email) ||
            password.Length < 12)
        {
            throw new InvalidOperationException(
                "BootstrapAdmin is enabled. Username, FullName, Email, and a password " +
                "of at least 12 characters are required.");
        }

        if (!await db.Admins.AnyAsync())
        {
            db.Admins.Add(new Admin
            {
                Username = username,
                FullName = fullName,
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                Role = "SuperAdmin",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
            app.Logger.LogInformation(
                "Created the initial SuperAdmin account {Username}. Disable BootstrapAdmin now.",
                username);
        }
        else
        {
            app.Logger.LogInformation(
                "BootstrapAdmin was enabled, but an admin already exists; no account was created.");
        }
    }
}

// Convert unhandled exceptions into consistent JSON problem details instead of
// leaking stack traces or returning an empty 500.
app.UseExceptionHandler();

// Defense-in-depth response headers for API JSON and uploaded files. Pages
// receives its own browser-specific CSP from each site's _headers file.
app.Use(async (context, next) =>
{
    context.Response.OnStarting(() =>
    {
        var headers = context.Response.Headers;
        headers.TryAdd("X-Content-Type-Options", "nosniff");
        headers.TryAdd("X-Frame-Options", "DENY");
        headers.TryAdd("Referrer-Policy", "no-referrer");
        headers.TryAdd("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
        headers.TryAdd("Cross-Origin-Resource-Policy", "cross-origin");
        if (!app.Environment.IsDevelopment())
        {
            headers.TryAdd(
                "Content-Security-Policy",
                "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
        }
        return Task.CompletedTask;
    });

    await next();
});

// When enabled, reject direct access to the hosting-provider origin and trust
// client forwarding headers only from our secret-bearing Cloudflare Worker.
app.UseMiddleware<CloudflareOriginMiddleware>();

if (!app.Environment.IsDevelopment())
    app.UseHsts();

// Provider liveness probes can call /health directly over the provider's
// internal HTTP network. All user-facing traffic remains HTTPS-only.
app.UseWhen(
    context => !string.Equals(
        context.Request.Path.Value,
        "/health",
        StringComparison.OrdinalIgnoreCase),
    branch => branch.UseHttpsRedirection());

// Serve uploaded files (profile pictures, etc.) under /Uploads.
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(Directory.GetCurrentDirectory(), "Uploads")),
    RequestPath = "/Uploads"
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowedClients");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }))
    .AllowAnonymous();
app.MapControllers();

app.Run();

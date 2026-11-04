using MyApp.Application.Interfaces;

namespace MyApp.API.Services
{
    // Publishes scheduled events as their PublishAt elapses and sends the
    // existing "New Event" announcement at that moment. IEventService is
    // scoped, so every tick resolves it from a fresh dependency scope.
    public class EventPublishHostedService : BackgroundService
    {
        private static readonly TimeSpan Interval = TimeSpan.FromSeconds(30);
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<EventPublishHostedService> _logger;

        public EventPublishHostedService(
            IServiceScopeFactory scopeFactory,
            ILogger<EventPublishHostedService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                return;
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var eventService = scope.ServiceProvider.GetRequiredService<IEventService>();
                    await eventService.PublishDueEventsAsync();
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    // A transient database/notification failure must not stop
                    // every later schedule from publishing.
                    _logger.LogError(ex, "Publishing due events failed; will retry.");
                }

                try
                {
                    await Task.Delay(Interval, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }
    }
}

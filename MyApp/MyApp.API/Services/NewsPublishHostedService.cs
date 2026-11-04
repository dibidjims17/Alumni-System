using MyApp.Application.Interfaces;

namespace MyApp.API.Services
{
    // Promotes scheduled news posts the moment their PublishAt elapses and
    // fires the "New Post" announcement for them. Without this a time-gated
    // post would only become visible (and only notify students) the next
    // time somebody happened to open the news feed.
    //
    // INewsService is scoped, so each tick resolves it from a fresh scope
    // rather than from the host's root provider.
    public class NewsPublishHostedService : BackgroundService
    {
        private static readonly TimeSpan Interval = TimeSpan.FromSeconds(30);
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<NewsPublishHostedService> _logger;

        public NewsPublishHostedService(
            IServiceScopeFactory scopeFactory,
            ILogger<NewsPublishHostedService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Let the app finish starting (and migrations settle) first.
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
                    var newsService = scope.ServiceProvider.GetRequiredService<INewsService>();
                    await newsService.PublishDueNewsAsync();
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    // Never let one bad tick kill the loop — otherwise every
                    // scheduled post after a transient error would be stuck.
                    _logger.LogError(ex, "Publishing due news failed; will retry.");
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

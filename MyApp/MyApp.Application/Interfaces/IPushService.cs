namespace MyApp.Application.Interfaces
{
    public interface IPushService
    {
        Task SendAsync(IReadOnlyCollection<string> tokens, string title, string body, string type, int? relatedId);
    }
}

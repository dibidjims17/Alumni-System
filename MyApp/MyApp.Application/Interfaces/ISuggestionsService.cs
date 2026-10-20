using System.Collections.Generic;
using System.Threading.Tasks;

namespace MyApp.Application.Interfaces
{
    public interface ISuggestionsService
    {
        Task<List<string>> GetSuggestionsAsync(string? term, string? type);
    }
}

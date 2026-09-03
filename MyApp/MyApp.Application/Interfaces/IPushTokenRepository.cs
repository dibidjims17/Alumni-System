namespace MyApp.Application.Interfaces
{
    public interface IPushTokenRepository
    {
        Task<List<string>> GetTokensByStudentIdAsync(int studentId);
        Task<List<string>> GetTokensForActiveStudentsAsync(bool graduatesOnly);
        Task UpsertAsync(int studentId, string token, string platform);
        Task<bool> DeleteByTokenAsync(string token);
    }
}

using MyApp.Shared.DTOs;

namespace MyApp.Application.Interfaces
{
    public interface IAdminAuthService
    {
        Task<AdminLoginResponse?> LoginAsync(AdminLoginRequest request);
        Task<(bool Success, string Message, AdminLoginResponse? Response)> LoginWithGoogleAsync(string idToken);
        Task ForgotPasswordAsync(ForgotPasswordRequest request);
        Task<(bool Success, string Message)> ResetPasswordAsync(ResetPasswordRequest request);
        Task<(bool Success, string Message)> ChangePasswordAsync(
            int adminId, ChangePasswordRequest request, string ipAddress);
    }
}

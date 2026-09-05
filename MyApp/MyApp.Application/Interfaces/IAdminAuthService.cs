using MyApp.Shared.DTOs;

namespace MyApp.Application.Interfaces
{
    public interface IAdminAuthService
    {
        Task<AdminLoginResponse?> LoginAsync(AdminLoginRequest request);
        Task ForgotPasswordAsync(ForgotPasswordRequest request);
        Task<bool> ResetPasswordAsync(ResetPasswordRequest request);
    }
}
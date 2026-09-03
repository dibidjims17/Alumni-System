using MyApp.Domain.Entities;
using MyApp.Shared.DTOs;

namespace MyApp.Application.Interfaces
{
    public interface IAuthService
    {
        Task<LoginResponse?> LoginAsync(LoginRequest request, string ipAddress);
        Task<bool> ChangePasswordAsync(int studentId, ChangePasswordRequest request, string ipAddress);
        Task ForgotPasswordAsync(ForgotPasswordRequest request);
        Task<bool> ResetPasswordAsync(ResetPasswordRequest request);
    }
}
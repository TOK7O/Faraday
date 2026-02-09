﻿using Faraday.API.DTOs;

namespace Faraday.API.Services.Interfaces
{
    public interface IAuthService
    {
        // Allows users to log into the system.
        Task<LoginResponseDto> LoginAsync(LoginDto dto);
        
        // Allows admins to register new users into the system.
        Task RegisterAsync(RegisterDto dto);
        
        // Generates the secret key and QR code but does NOT enable 2FA.
        Task<TwoFactorSetupDto> InitiateTwoFactorSetupAsync(int userId);
        
        // Verifies the user's code and permanently enables 2FA for the account.
        Task FinalizeTwoFactorSetupAsync(int userId, string code);
        
        //Allows authenticated users to disable their 2FA.
        Task DisableTwoFactorAsync(int userId);
        
        // Allows authenticated users to change their password.
        Task ChangePasswordAsync(int userId, ChangePasswordDto dto);
        
        // Admin User Management
        Task<List<UserListDto>> GetAllUsersAsync();
        Task<UserListDto> UpdateUserAsync(int targetUserId, int adminId, UserUpdateDto dto);
        Task ResetUserPasswordAsync(int targetUserId, int adminId, string newPassword);
        Task ResetUser2FAAsync(int targetUserId, int adminId);

        // Forgot/Reset Password
        Task ForgotPasswordAsync(string email);
        Task ResetPasswordAsync(ResetPasswordDto dto);
    }
}
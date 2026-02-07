using System.ComponentModel.DataAnnotations;
using Faraday.API.Models;

namespace Faraday.API.DTOs
{
    public class RegisterDto
    {
        [Required]
        public string Username { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;

        public UserRole Role { get; set; } = UserRole.WarehouseWorker;
    }

    public class LoginDto
    {
        [Required]
        public string Username { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;
        
        // Optional: Only required if the user has 2FA enabled.
        public string? TwoFactorCode { get; set; }
    }

    public class LoginResponseDto
    {
        public string Token { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
    }

    public class TwoFactorSetupDto
    {
        // The manual key allows users to type it in if they can't scan the QR code.
        public string ManualEntryKey { get; set; } = string.Empty;
        public string QrCodeImage { get; set; } = string.Empty;
    }

    public class TwoFactorVerifyDto
    {
        public string Code { get; set; } = string.Empty;
    }
    
    public class ChangePasswordDto
    {
        [Required]
        public string OldPassword { get; set; } = string.Empty;

        [Required]
        public string NewPassword { get; set; } = string.Empty;
    }
}
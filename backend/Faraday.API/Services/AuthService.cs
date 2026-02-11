using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OtpNet;
using QRCoder;
using Faraday.API.Data;
using Faraday.API.DTOs;
using Faraday.API.Models;
using Faraday.API.Services.Interfaces;

namespace Faraday.API.Services
{
    /// <summary>
    /// Handles authentication, user registration, Two-Factor Authentication (2FA) flows,
    /// and administrative user management operations.
    /// </summary>
    public class AuthService(
        FaradayDbContext context,
        IConfiguration configuration,
        IEmailService emailService,
        ILogger<AuthService> logger)
        : IAuthService
    {
        /// <summary>
        /// Authenticates a user based on username and password.
        /// Handles the initial password check and the subsequent 2FA verification if enabled.
        /// </summary>
        public async Task<LoginResponseDto> LoginAsync(LoginDto dto)
        {
            var user = await context.Users.FirstOrDefaultAsync(u => u.Username == dto.Username);
            
            // Verify the password using BCrypt to compare against the stored hash.
            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                // Log generic warning to avoid revealing which part (user or pass) was incorrect, 
                // but keep internal logs detailed for security auditing.
                logger.LogWarning("Failed login attempt for user: {Username} from IP: {IP}", 
                    dto.Username, "IP_ADDRESS_HERE");
                throw new Exception("Incorrect login or password");
            }

            if (!user.IsActive)
            {
                logger.LogWarning("Login attempt for disabled account: {Username}", dto.Username);
                throw new Exception("Account is disabled.");
            }

            // 2FA Verification Logic
            if (user.IsTwoFactorEnabled)
            {
                // If the user has 2FA enabled but didn't send a code, we stop here.
                // The frontend should catch this specific exception string to prompt the user for the code.
                if (string.IsNullOrEmpty(dto.TwoFactorCode))
                {
                    // We throw a specific error message intended for global exception
                    // handling to map to HTTP 428 (Precondition Required).
                    throw new InvalidOperationException("2FA_REQUIRED");
                }

                if (string.IsNullOrEmpty(user.TwoFactorSecretKey))
                {
                    throw new Exception("2FA configuration error. Secret key missing.");
                }

                // Verify the TOTP code
                var bytes = Base32Encoding.ToBytes(user.TwoFactorSecretKey);
                var totp = new Totp(bytes);
                
                // Using RfcSpecifiedNetworkDelay allows for a slight time drift between server and client
                // This is crucial for mobile authenticators that might not be perfectly synced with server time.
                bool valid = totp.VerifyTotp(dto.TwoFactorCode, out _, VerificationWindow.RfcSpecifiedNetworkDelay);

                if (!valid)
                {
                    logger.LogWarning("Invalid 2FA code for user: {Username}", dto.Username);
                    throw new Exception("Invalid 2FA code.");
                }
            }

            user.LastLoginDate = DateTime.UtcNow;
            await context.SaveChangesAsync();

            logger.LogInformation("User logged in successfully: {Username} (Role: {Role})", user.Username, user.Role);
            
            var token = GenerateJwtToken(user);

            return new LoginResponseDto
            {
                Token = token,
                Username = user.Username,
                Role = user.Role.ToString()
            };
        }

        public async Task RegisterAsync(RegisterDto dto)
        {
            if (await context.Users.AnyAsync(u => u.Username == dto.Username))
            {
                logger.LogWarning("Registration attempt with existing username: {Username}", dto.Username);
                throw new Exception("User already exists.");
            }

            var user = new User
            {
                Username = dto.Username,
                Email = dto.Email,
                Role = dto.Role,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                IsActive = true,
                IsTwoFactorEnabled = false // 2FA is always disabled upon registration (it's only optional)
            };

            context.Users.Add(user);
            await context.SaveChangesAsync();
            
            logger.LogInformation("New user registered: {Username} (Email: {Email}, Role: {Role})", 
                dto.Username, dto.Email, dto.Role);
        }

        /// <summary>
        /// Begins the 2FA setup process by generating a secret key and a QR code.
        /// NOTE: Does not enable 2FA on the user entity yet; <see cref="FinalizeTwoFactorSetupAsync"/> must be called.
        /// </summary>
        public async Task<TwoFactorSetupDto> InitiateTwoFactorSetupAsync(int userId)
        {
            var user = await context.Users.FindAsync(userId);
            if (user == null) throw new Exception("User not found");

            logger.LogInformation("2FA setup initiated for user: {Username} (ID: {UserId})", user.Username, userId);

            // Generate a random secret key
            var key = KeyGeneration.GenerateRandomKey(20);
            var secretBase32 = Base32Encoding.ToString(key);

            // Store the key, but do NOT enable 2FA yet to prevent lockout if the user fails to scan the QR.
            user.TwoFactorSecretKey = secretBase32;
            await context.SaveChangesAsync();
            
            // Generate the QR image2
            string otpAuthUri = $"otpauth://totp/FaradayWMS:{user.Username}?secret={secretBase32}&issuer=FaradayWMS";
            using var qrGenerator = new QRCodeGenerator();
            using var qrCodeData = qrGenerator.CreateQrCode(otpAuthUri, QRCodeGenerator.ECCLevel.Q);
            using var qrCode = new PngByteQRCode(qrCodeData);
            var qrCodeBytes = qrCode.GetGraphic(20);
            var qrCodeBase64 = Convert.ToBase64String(qrCodeBytes);

            return new TwoFactorSetupDto
            {
                ManualEntryKey = secretBase32,
                QrCodeImage = $"data:image/png;base64,{qrCodeBase64}"
            };
        }

        /// <summary>
        /// Completes the 2FA setup by validating a code generated from the secret key created in <see cref="InitiateTwoFactorSetupAsync"/>.
        /// This ensures the user has successfully scanned the QR code before we enforce 2FA.
        /// </summary>
        public async Task FinalizeTwoFactorSetupAsync(int userId, string code)
        {
            var user = await context.Users.FindAsync(userId);
            if (user == null) throw new Exception("User not found");

            if (string.IsNullOrEmpty(user.TwoFactorSecretKey))
            {
                logger.LogWarning("2FA finalization attempted without setup for user ID: {UserId}", userId);
                throw new Exception("Setup not initiated.");
            }

            // Verify the code provided by the user to ensure they scanned the QR correctly.
            var bytes = Base32Encoding.ToBytes(user.TwoFactorSecretKey);
            var totp = new Totp(bytes);
            bool valid = totp.VerifyTotp(code, out _, VerificationWindow.RfcSpecifiedNetworkDelay);

            if (!valid)
            {
                logger.LogWarning("Failed 2FA setup verification for user: {Username}", user.Username);
                throw new Exception("Invalid code. Setup failed.");
            }

            // Enable 2FA now that we have confirmed that the user has the code generator working.
            user.IsTwoFactorEnabled = true;
            await context.SaveChangesAsync();
            logger.LogInformation("2FA enabled for user: {Username}", user.Username);
        }

        public async Task DisableTwoFactorAsync(int userId)
        {
            var user = await context.Users.FindAsync(userId);
            if (user != null)
            {
                // Clears the key and flag to completely reset the 2FA state.
                user.IsTwoFactorEnabled = false;
                user.TwoFactorSecretKey = null;
                await context.SaveChangesAsync();
                
                logger.LogInformation("2FA disabled for user: {Username}", user.Username);
            }
        }
        
        /// <summary>
        /// Allows a logged-in user to change their own password.
        /// Requires the old password for security verification.
        /// </summary>
        public async Task ChangePasswordAsync(int userId, ChangePasswordDto dto)
        {
            var user = await context.Users.FindAsync(userId);
            if (user == null) throw new Exception("User not found.");

            // Verify the old password
            if (!BCrypt.Net.BCrypt.Verify(dto.OldPassword, user.PasswordHash))
            {
                logger.LogWarning("Failed password change attempt - incorrect old password for user: {Username}", 
                    user.Username);
                throw new Exception("Invalid old password.");
            }

            // Hash and update the new password
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await context.SaveChangesAsync();
            
            logger.LogInformation("Password changed successfully for user: {Username}", user.Username);
        }
        
        /// <summary>
        /// Retrieves all users for the admin dashboard.
        /// Includes inactive users (IgnoreQueryFilters).
        /// </summary>
        public async Task<List<UserListDto>> GetAllUsersAsync()
        {
            logger.LogInformation("Retrieving all users list (admin operation)");
            
            // IgnoreQueryFilters to include inactive users in the admin panel.
            // This is necessary if global filters are applied.
            var users = await context.Users
                .IgnoreQueryFilters()
                .OrderBy(u => u.Username)
                .Select(u => new UserListDto
                {
                    Id = u.Id,
                    Username = u.Username,
                    Email = u.Email,
                    Role = u.Role.ToString(),
                    IsActive = u.IsActive,
                    IsTwoFactorEnabled = u.IsTwoFactorEnabled,
                    LastLoginDate = u.LastLoginDate,
                    CreatedAt = u.CreatedAt
                })
                .ToListAsync();

            return users;
        }

        /// <summary>
        /// Updates a user profile
        /// Contains safeguards to prevent the system from being left without an active administrator.
        /// </summary>
        public async Task<UserListDto> UpdateUserAsync(int targetUserId, int adminId, UserUpdateDto dto)
        {
            // Fetch target user (including inactive ones)
            var user = await context.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Id == targetUserId);

            if (user == null)
                throw new KeyNotFoundException("User not found.");

            // Prevent admin from editing themselves
            if (targetUserId == adminId)
                throw new InvalidOperationException("You cannot edit your own account. Ask another administrator.");

            // Prevent removing the last active administrator
            if (dto.Role.HasValue || dto.IsActive.HasValue)
            {
                // Check if this is the last active admin
                // Counts other active admins excluding the one currently being edited.
                bool isLastAdmin = await context.Users
                    .CountAsync(u => u.Role == UserRole.Administrator && u.IsActive && u.Id != targetUserId) == 0;

                if (isLastAdmin)
                {
                    // Check if we're trying to demote or deactivate
                    bool tryingToDemote = dto.Role.HasValue && dto.Role.Value != UserRole.Administrator;
                    bool tryingToDeactivate = dto.IsActive is false;

                    if (tryingToDemote || tryingToDeactivate)
                    {
                        throw new InvalidOperationException(
                            "Cannot demote or deactivate the last active Administrator. " +
                            "System must have at least one active admin.");
                    }
                }
            }

            // Email uniqueness validation
            if (!string.IsNullOrEmpty(dto.Email) && dto.Email != user.Email)
            {
                bool emailExists = await context.Users
                    .IgnoreQueryFilters()
                    .AnyAsync(u => u.Email == dto.Email && u.Id != targetUserId);

                if (emailExists)
                    throw new InvalidOperationException($"Email '{dto.Email}' is already in use by another user.");
            }

            // Apply changes
            if (!string.IsNullOrEmpty(dto.Email))
                user.Email = dto.Email;

            if (dto.Role.HasValue)
                user.Role = dto.Role.Value;

            if (dto.IsActive.HasValue)
                user.IsActive = dto.IsActive.Value;

            user.UpdatedAt = DateTime.UtcNow;

            await context.SaveChangesAsync();
            
            logger.LogInformation("User updated successfully by admin " +
                                   "{AdminId}. Target user: {Username} (ID: {TargetUserId})", 
                                    adminId, user.Username, targetUserId);

            // Return updated user data
            return new UserListDto
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                Role = user.Role.ToString(),
                IsActive = user.IsActive,
                IsTwoFactorEnabled = user.IsTwoFactorEnabled,
                LastLoginDate = user.LastLoginDate,
                CreatedAt = user.CreatedAt
            };
        }

        /// <summary>
        /// Administrative override to reset a user's password without needing the old one.
        /// </summary>
        public async Task ResetUserPasswordAsync(int targetUserId, int adminId, string newPassword)
        {
            var user = await context.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Id == targetUserId);

            if (user == null)
            {
                logger.LogWarning("Admin {AdminId} attempted to reset password for non-existent user ID: {TargetUserId}", 
                    adminId, targetUserId);
                throw new KeyNotFoundException("User not found.");
            }

            // Prevent admin from resetting their own password this way (they should use ChangePassword)
            // Just remember this: Admin Reset is for *others*, ChangePassword is for *self*.
            if (targetUserId == adminId)
            {
                logger.LogWarning("Admin {AdminId} attempted to reset their own password via admin function", adminId);
                throw new InvalidOperationException("You cannot reset your own password. Use the 'Change Password' feature instead.");
            }
            
            // Hash and update password
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            user.UpdatedAt = DateTime.UtcNow;

            await context.SaveChangesAsync();
            
            logger.LogWarning("Admin {AdminId} reset password for user: {Username} (ID: {TargetUserId})", 
                adminId, user.Username, targetUserId);
        }

        /// <summary>
        /// Administrative override to remove 2FA from a user's account.
        /// </summary>
        public async Task ResetUser2FAAsync(int targetUserId, int adminId)
        {
            var user = await context.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Id == targetUserId);

            if (user == null)
                throw new KeyNotFoundException("User not found.");

            // Prevent admin from resetting their own 2FA this way (they should use Disable2FA)
            if (targetUserId == adminId)
                throw new InvalidOperationException("You cannot reset your own 2FA. Use the 'Disable 2FA' feature instead.");

            // Reset 2FA completely
            user.IsTwoFactorEnabled = false;
            user.TwoFactorSecretKey = null;
            user.UpdatedAt = DateTime.UtcNow;

            logger.LogWarning("Admin {AdminId} reset 2FA for user: {Username} (ID: {TargetUserId})",
                                adminId, user.Username, targetUserId);
            
            await context.SaveChangesAsync();
        }

        public async Task ForgotPasswordAsync(string email)
        {
            var user = await context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
            {
                // We should always return success, as to not reveal if email actually exists in the db
                logger.LogInformation("Password reset requested for non-existent email: {Email}", email);
                return;
            }

            // Token generation using cryptographically secure RNG.
            user.PasswordResetToken = Convert.ToHexString(System.Security.Cryptography.RandomNumberGenerator.GetBytes(64));
            user.ResetTokenExpires = DateTime.UtcNow.AddHours(1);

            await context.SaveChangesAsync();

            var baseUrl = configuration["ClientApp:BaseUrl"] ?? "http://localhost:5173";
            var resetLink = $"{baseUrl}/reset-password?token={user.PasswordResetToken}";

            await emailService.SendPasswordResetEmailAsync(user.Email, resetLink);
            
            logger.LogInformation("Password reset email sent to user: {Username} ({Email})", 
                user.Username, user.Email);
        }

        public async Task ResetPasswordAsync(ResetPasswordDto dto)
        {
            var user = await context.Users.FirstOrDefaultAsync(u => u.PasswordResetToken == dto.Token);

            // Validate token existence and expiration
            if (user == null || user.ResetTokenExpires < DateTime.UtcNow)
            {
                logger.LogWarning("Invalid or expired password reset token used: {Token}", 
                    dto.Token.Substring(0, 10) + "...");
                throw new Exception("Invalid or expired password reset token.");
            }
            
            // Set a new password and consume the token
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            user.PasswordResetToken = null;
            user.ResetTokenExpires = null;

            await context.SaveChangesAsync();
            
            logger.LogInformation("Password reset successfully for user: {Username}", user.Username);
        }

        private string GenerateJwtToken(User user)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role.ToString()),
                new Claim("id", user.Id.ToString())
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256Signature);

            var token = new JwtSecurityToken(
                issuer: configuration["Jwt:Issuer"],
                audience: configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(1), // Token valid for 1h
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
        
        /// <summary>
        /// Refreshes the JWT token for an authenticated user.
        /// Generates a new token with extended expiration time.
        /// </summary>
        /// <param name="userId">ID of the authenticated user requesting token refresh</param>
        /// <returns>New JWT token with user information</returns>
        public async Task<LoginResponseDto> RefreshTokenAsync(int userId)
        {
            var user = await context.Users.FindAsync(userId);
    
            if (user == null)
            {
                logger.LogWarning("Token refresh attempted for non-existent user ID: {UserId}", userId);
                throw new Exception("User not found.");
            }

            if (!user.IsActive)
            {
                logger.LogWarning("Token refresh attempted for inactive user: {Username}", user.Username);
                throw new Exception("Account is disabled.");
            }

            // Update last activity timestamp
            user.LastLoginDate = DateTime.UtcNow;
            await context.SaveChangesAsync();

            logger.LogInformation("Token refreshed for user: {Username} (ID: {UserId})", user.Username, userId);

            var token = GenerateJwtToken(user);

            return new LoginResponseDto
            {
                Token = token,
                Username = user.Username,
                Role = user.Role.ToString()
            };
        }

        public async Task<bool> GetTwoFactorEnabledStatusAsync(int userId)
        {
            var user = await context.Users.FindAsync(userId);
            return user?.IsTwoFactorEnabled ?? false;
        }

        /// <summary>
        /// Deletes a user from the database. Only available to administrators. Safeguards similar to deactivation.
        /// </summary>
        public async Task DeleteUserAsync(int targetUserId, int adminId)
        {
            if (targetUserId == adminId)
                throw new InvalidOperationException("You cannot delete yourself.");

            var admin = await context.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == adminId);
            if (admin == null || admin.Role != UserRole.Administrator)
                throw new UnauthorizedAccessException("Only an administrator can delete users.");

            var user = await context.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == targetUserId);
            if (user == null)
                throw new KeyNotFoundException("User does not exist.");

            // Cannot delete the last active administrator
            if (user is { Role: UserRole.Administrator, IsActive: true })
            {
                int activeAdmins = await context.Users.CountAsync(u => u.Role == UserRole.Administrator && u.IsActive && u.Id != targetUserId);
                if (activeAdmins == 0)
                    throw new InvalidOperationException("Cannot delete the last active administrator.");
            }

            // Log the operation
            logger.LogWarning("Administrator {AdminName} (ID: {AdminId}) is deleting user {UserName} (ID: {UserId})", admin.Username, adminId, user.Username, targetUserId);

            // Audit update (optional, if the model has UpdatedAt)
            user.UpdatedAt = DateTime.UtcNow;

            context.Users.Remove(user);
            await context.SaveChangesAsync();
        }
    }
}


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
    public class AuthService : IAuthService
    {
        private readonly FaradayDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthService(FaradayDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<LoginResponseDto> LoginAsync(LoginDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == dto.Username);
            
            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                throw new Exception("Incorrect login or password");
            }

            if (!user.IsActive)
            {
                throw new Exception("Account is disabled.");
            }

            // --- 2FA Verification Logic ---
            if (user.IsTwoFactorEnabled)
            {
                if (string.IsNullOrEmpty(dto.TwoFactorCode))
                {
                    // We throw a specific error message that the Controller will map to HTTP 428
                    throw new InvalidOperationException("2FA_REQUIRED");
                }

                if (string.IsNullOrEmpty(user.TwoFactorSecretKey))
                {
                    throw new Exception("2FA configuration error. Secret key missing.");
                }

                // Verify the TOTP code
                var bytes = Base32Encoding.ToBytes(user.TwoFactorSecretKey);
                var totp = new Totp(bytes);
                
                // Using RfcSpecifiedNetworkDelay allows for a slight time drift (+/- 30 sec) between server and client
                bool valid = totp.VerifyTotp(dto.TwoFactorCode, out _, VerificationWindow.RfcSpecifiedNetworkDelay);

                if (!valid)
                {
                    throw new Exception("Invalid 2FA code.");
                }
            }

            user.LastLoginDate = DateTime.UtcNow;
            await _context.SaveChangesAsync();

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
            if (await _context.Users.AnyAsync(u => u.Username == dto.Username))
            {
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

            _context.Users.Add(user);
            await _context.SaveChangesAsync();
        }

        public async Task<TwoFactorSetupDto> InitiateTwoFactorSetupAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new Exception("User not found");

            // 1. Generate a random secret key
            var key = KeyGeneration.GenerateRandomKey(20);
            var secretBase32 = Base32Encoding.ToString(key);

            // Store the key, but do NOT enable 2FA yet to prevent lockout if the user fails to scan the QR.
            user.TwoFactorSecretKey = secretBase32;
            await _context.SaveChangesAsync();

            // 2. Generate Google Authenticator compatible URI
            string otpAuthUri = $"otpauth://totp/FaradayWMS:{user.Username}?secret={secretBase32}&issuer=FaradayWMS";

            // 3. Generate QR Code image
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

        public async Task FinalizeTwoFactorSetupAsync(int userId, string code)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new Exception("User not found");

            if (string.IsNullOrEmpty(user.TwoFactorSecretKey))
                throw new Exception("Setup not initiated.");

            // Verify the code provided by the user to ensure they scanned the QR correctly.
            var bytes = Base32Encoding.ToBytes(user.TwoFactorSecretKey);
            var totp = new Totp(bytes);
            bool valid = totp.VerifyTotp(code, out _, VerificationWindow.RfcSpecifiedNetworkDelay);

            if (!valid)
                throw new Exception("Invalid code. Setup failed.");

            // Enable 2FA now that we have confirmed that the user has the code generator working.
            user.IsTwoFactorEnabled = true;
            await _context.SaveChangesAsync();
        }

        public async Task DisableTwoFactorAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user != null)
            {
                user.IsTwoFactorEnabled = false;
                user.TwoFactorSecretKey = null; // Clear the secret for security
                await _context.SaveChangesAsync();
            }
        }
        
        public async Task ChangePasswordAsync(int userId, ChangePasswordDto dto)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new Exception("User not found.");

            // Verify the old password
            if (!BCrypt.Net.BCrypt.Verify(dto.OldPassword, user.PasswordHash))
            {
                throw new Exception("Invalid old password.");
            }

            // Hash and update the new password
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();
        }
        
        public async Task<List<UserListDto>> GetAllUsersAsync()
        {
            // IgnoreQueryFilters to include inactive users in admin panel
            var users = await _context.Users
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

        public async Task<UserListDto> UpdateUserAsync(int targetUserId, int adminId, UserUpdateDto dto)
        {
            // Fetch target user (including inactive ones for admin panel)
            var user = await _context.Users
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
                bool isLastAdmin = await _context.Users
                    .CountAsync(u => u.Role == UserRole.Administrator && u.IsActive && u.Id != targetUserId) == 0;

                if (isLastAdmin)
                {
                    // Check if we're trying to demote or deactivate
                    bool tryingToDemote = dto.Role.HasValue && dto.Role.Value != UserRole.Administrator;
                    bool tryingToDeactivate = dto.IsActive.HasValue && dto.IsActive.Value == false;

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
                bool emailExists = await _context.Users
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

            await _context.SaveChangesAsync();

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

        public async Task ResetUserPasswordAsync(int targetUserId, int adminId, string newPassword)
        {
            var user = await _context.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Id == targetUserId);

            if (user == null)
                throw new KeyNotFoundException("User not found.");

            // Prevent admin from resetting their own password this way (they should use ChangePassword)
            if (targetUserId == adminId)
                throw new InvalidOperationException("You cannot reset your own password. Use the 'Change Password' feature instead.");

            // Hash and update password
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        public async Task ResetUser2FAAsync(int targetUserId, int adminId)
        {
            var user = await _context.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Id == targetUserId);

            if (user == null)
                throw new KeyNotFoundException("User not found.");

            // Prevent admin from resetting their own 2FA this way (they should use Disable2FA)
            if (targetUserId == adminId)
                throw new InvalidOperationException("You cannot reset your own 2FA. Use the 'Disable 2FA' feature instead.");

            // VALIDATION 4: Reset 2FA completely
            user.IsTwoFactorEnabled = false;
            user.TwoFactorSecretKey = null;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        private string GenerateJwtToken(User user)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role.ToString()),
                new Claim("id", user.Id.ToString())
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256Signature);

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddDays(1),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
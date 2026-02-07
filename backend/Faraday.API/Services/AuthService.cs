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
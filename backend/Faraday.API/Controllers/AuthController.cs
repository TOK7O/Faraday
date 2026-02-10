using Microsoft.AspNetCore.Mvc;
using Faraday.API.DTOs;
using Faraday.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;

namespace Faraday.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            IAuthService authService,
            ILogger<AuthController> logger) 
        {
            _authService = authService;
            _logger = logger;
        }

        [Authorize(Roles = "Administrator")]
        [HttpPost("register")]
        public async Task<ActionResult> Register(RegisterDto request)
        {
            try
            {
                await _authService.RegisterAsync(request);
                return Ok("Registered successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Registration endpoint error for username: {Username}", request.Username);
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("login")]
        public async Task<ActionResult<LoginResponseDto>> Login(LoginDto request)
        {
            try
            {
                var response = await _authService.LoginAsync(request);
                return Ok(response);
            }
            // We use 428 Precondition Required to signal the frontend that 2FA code is missing.
            // This tells the UI to show the "Enter 2FA Code" input.
            catch (InvalidOperationException ex) when (ex.Message == "2FA_REQUIRED")
            {
                return StatusCode(428, new { Message = "Two-Factor Authentication required", Code = "2FA_REQUIRED" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Login endpoint error for user: {Username}", request.Username);
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPost("2fa/setup")]
        public async Task<ActionResult<TwoFactorSetupDto>> SetupTwoFactor()
        {
            try
            {
                var userId = int.Parse(User.FindFirst("id")!.Value);
                _logger.LogInformation("2FA setup initiated for user ID: {UserId}", userId);
                var result = await _authService.InitiateTwoFactorSetupAsync(userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
        
        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword(ChangePasswordDto request)
        {
            try
            {
                var userId = int.Parse(User.FindFirst("id")!.Value);
                await _authService.ChangePasswordAsync(userId, request);
                return Ok(new { Message = "Password changed successfully." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Change password endpoint error");
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPost("2fa/enable")]
        public async Task<IActionResult> EnableTwoFactor([FromBody] TwoFactorVerifyDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirst("id")!.Value);
                _logger.LogInformation("2FA enable request for user ID: {UserId}", userId);
                await _authService.FinalizeTwoFactorSetupAsync(userId, dto.Code);
                return Ok(new { Message = "2FA has been enabled." });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPost("2fa/disable")]
        public async Task<IActionResult> DisableTwoFactor()
        {
            var userId = int.Parse(User.FindFirst("id")!.Value);
            _logger.LogInformation("2FA disable request for user ID: {UserId}", userId);
            await _authService.DisableTwoFactorAsync(userId);
            return Ok(new { Message = "2FA disabled." });
        }

        [Authorize]
        [HttpGet("2fa/status")]
        public async Task<IActionResult> GetTwoFactorStatus()
        {
            var userId = int.Parse(User.FindFirst("id")!.Value);
            _logger.LogInformation("2FA status check for user ID: {UserId}", userId);
            var isEnabled = await _authService.GetTwoFactorEnabledStatusAsync(userId);
            return Ok(new { IsEnabled = isEnabled });
        }

        /// <summary>
        /// Get list of all users in the system (including inactive).
        /// Only accessible by Administrators.
        /// </summary>
        [Authorize(Roles = "Administrator")]
        [HttpGet("users")]
        public async Task<ActionResult<List<UserListDto>>> GetAllUsers()
        {
            var users = await _authService.GetAllUsersAsync();
            return Ok(users);
        }

        /// <summary>
        /// Update user details: email, role, or active status.
        /// Admins cannot edit themselves. Cannot demote/deactivate the last admin.
        /// </summary>
        [Authorize(Roles = "Administrator")]
        [HttpPut("users/{targetUserId}")]
        public async Task<ActionResult<UserListDto>> UpdateUser(int targetUserId, [FromBody] UserUpdateDto dto)
        {
            try
            {
                var adminId = int.Parse(User.FindFirst("id")!.Value);
                var updatedUser = await _authService.UpdateUserAsync(targetUserId, adminId, dto);
                return Ok(updatedUser);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ex.Message);
            }
        }

        /// <summary>
        /// Admin can reset user's password (e.g., when user forgot it).
        /// Admin cannot reset their own password this way.
        /// </summary>
        [Authorize(Roles = "Administrator")]
        [HttpPost("users/{targetUserId}/reset-password")]
        public async Task<IActionResult> ResetUserPassword(int targetUserId, [FromBody] AdminPasswordResetDto dto)
        {
            try
            {
                var adminId = int.Parse(User.FindFirst("id")!.Value);
                await _authService.ResetUserPasswordAsync(targetUserId, adminId, dto.NewPassword);
                return Ok(new { Message = "Password reset successfully." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ex.Message);
            }
        }

        /// <summary>
        /// Admin can reset user's 2FA (e.g., when user lost their phone).
        /// This disables 2FA and removes the secret key.
        /// </summary>
        [Authorize(Roles = "Administrator")]
        [HttpPost("users/{targetUserId}/reset-2fa")]
        public async Task<IActionResult> ResetUser2FA(int targetUserId)
        {
            try
            {
                var adminId = int.Parse(User.FindFirst("id")!.Value);
                await _authService.ResetUser2FAAsync(targetUserId, adminId);
                return Ok(new { Message = "2FA has been reset for the user." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(ex.Message);
            }
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword(ForgotPasswordDto request)
        {
            try
            {
                await _authService.ForgotPasswordAsync(request.Email);
                return Ok(new { Message = "If an account with that email exists, a reset link has been sent." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Forgot password endpoint error");
                // Always return OK here, even if the email address is invalid.
                return Ok(new { Message = "If an account with that email exists, a reset link has been sent." });
            }
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword(ResetPasswordDto request)
        {
            try
            {
                await _authService.ResetPasswordAsync(request);
                return Ok(new { Message = "Password has been reset successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
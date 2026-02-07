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

        public AuthController(IAuthService authService)
        {
            _authService = authService;
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
            await _authService.DisableTwoFactorAsync(userId);
            return Ok(new { Message = "2FA disabled." });
        }
    }
}
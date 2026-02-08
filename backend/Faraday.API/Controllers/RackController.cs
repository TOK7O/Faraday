using Faraday.API.DTOs;
using Faraday.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Faraday.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Require JWT for all endpoints by default
    public class RackController : ControllerBase
    {
        private readonly IRackService _rackService;

        public RackController(IRackService rackService)
        {
            _rackService = rackService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<RackDto>>> GetAll()
        {
            var racks = await _rackService.GetAllRacksAsync();
            return Ok(racks);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<RackDto>> GetById(int id)
        {
            var rack = await _rackService.GetRackByIdAsync(id);
            if (rack == null)
            {
                return NotFound($"Rack with ID {id} not found.");
            }
            return Ok(rack);
        }

        [HttpPost]
        public async Task<ActionResult<RackDto>> Create(RackCreateDto dto)
        {
            try
            {
                var createdRack = await _rackService.CreateRackAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = createdRack.Id }, createdRack);
            }
            catch (InvalidOperationException ex)
            {
                // Rack code already exists
                return BadRequest(ex.Message);
            }
        }
        
        [HttpPut("{id}")]
        public async Task<ActionResult<RackDto>> Update(int id, RackUpdateDto dto)
        {
            try
            {
                var updatedRack = await _rackService.UpdateRackAsync(id, dto);
                return Ok(updatedRack);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                // Validation failed - new constraints incompatible with current inventory
                return Conflict(ex.Message);
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Administrator,Manager")] // Only higher roles can delete
        public async Task<IActionResult> Delete(int id)
        {
            await _rackService.DeleteRackAsync(id);
            return NoContent();
        }

        [HttpPost("import")]
        public async Task<IActionResult> ImportCsv(IFormFile? file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest("No file uploaded.");
            }

            if (!file.FileName.EndsWith(".csv"))
            {
                return BadRequest("File must be a CSV.");
            }

            using var stream = file.OpenReadStream();
            var result = await _rackService.ImportRacksFromCsvAsync(stream);

            return Ok(new
            {
                Message = "Import completed",
                SuccessCount = result.successCount,
                ErrorCount = result.errorCount,
                Errors = result.errors
            });
        }
    }
}
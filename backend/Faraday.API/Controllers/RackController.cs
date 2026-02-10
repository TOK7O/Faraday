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
        private readonly ILogger<RackController> _logger;
        public RackController(
            IRackService rackService, 
            ILogger<RackController> logger)
        {
            _rackService = rackService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<RackDto>>> GetAll()
        {
            _logger.LogInformation("Retrieving all racks");
            var racks = await _rackService.GetAllRacksAsync();
            return Ok(racks);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<RackDto>> GetById(int id)
        {
            _logger.LogInformation("Retrieving rack by ID: {RackId}", id);
            var rack = await _rackService.GetRackByIdAsync(id);
            if (rack == null)
            {
                return NotFound($"Rack with ID {id} not found.");
            }
            return Ok(rack);
        }

        [HttpPost]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<RackDto>> Create(RackCreateDto dto)
        {
            _logger.LogInformation("Rack creation initiated: {RackCode}", dto.Code);
            try
            {
                var createdRack = await _rackService.CreateRackAsync(dto);
                _logger.LogInformation("Rack created successfully: {RackCode} (ID: {RackId})", createdRack.Code, createdRack.Id);
                return CreatedAtAction(nameof(GetById), new { id = createdRack.Id }, createdRack);
            }
            catch (InvalidOperationException ex)
            {
                // Rack code already exists
                return BadRequest(ex.Message);
            }
        }
        
        [HttpPut("{id}")]
        [Authorize(Roles = "Administrator")]
        public async Task<ActionResult<RackDto>> Update(int id, RackUpdateDto dto)
        {
            try
            {
                _logger.LogInformation("Rack update initiated for ID: {RackId}", id);
                var updatedRack = await _rackService.UpdateRackAsync(id, dto);
                _logger.LogInformation("Rack updated successfully: {RackCode} (ID: {RackId})", updatedRack.Code, id);
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
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> Delete(int id)
        {
            _logger.LogInformation("Rack deletion initiated for ID: {RackId}", id);
            await _rackService.DeleteRackAsync(id);
            _logger.LogInformation("Rack soft-deleted successfully. ID: {RackId}", id);
            return NoContent();
        }

        [HttpPost("import")]
        [Authorize(Roles = "Administrator")]
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
            _logger.LogInformation("Rack CSV import initiated. Filename: {FileName}", file.FileName);
            using var stream = file.OpenReadStream();
            var result = await _rackService.ImportRacksFromCsvAsync(stream);
            _logger.LogInformation("Rack CSV import completed. " +
                                   "Success: {SuccessCount}, Errors: {ErrorCount}", 
                                    result.successCount, result.errorCount);
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
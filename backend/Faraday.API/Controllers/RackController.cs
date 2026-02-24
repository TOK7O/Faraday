using Faraday.API.DTOs;
using Faraday.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Faraday.API.Controllers;

/// <summary>
/// API Controller for managing the physical storage infrastructure (Racks).
/// Handles CRUD operations, configuration of physical constraints (dimensions, weight, temperature),
/// and bulk imports via CSV.
/// </summary>
[Route("api/[controller]")]
[ApiController]
[Authorize]
public class RackController(
    IRackService rackService,
    ILogger<RackController> logger)
    : ControllerBase
{
    /// <summary>
    /// Retrieves a list of all defined racks in the warehouse.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<RackDto>>> GetAll()
    {
        logger.LogInformation("Retrieving all racks");
        var racks = await rackService.GetAllRacksAsync();
        return Ok(racks);
    }

    /// <summary>
    /// Retrieves details of a specific rack by its ID.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<RackDto>> GetById(int id)
    {
        logger.LogInformation("Retrieving rack by ID: {RackId}", id);
        var rack = await rackService.GetRackByIdAsync(id);
        if (rack == null)
        {
            return NotFound($"Rack with ID {id} not found.");
        }
        return Ok(rack);
    }

    /// <summary>
    /// Creates a new rack definition.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Administrator")]
    public async Task<ActionResult<RackDto>> Create(RackCreateDto dto)
    {
        logger.LogInformation("Rack creation initiated: {RackCode}", dto.Code);
        try
        {
            var createdRack = await rackService.CreateRackAsync(dto);
            logger.LogInformation("Rack created successfully: {RackCode} (ID: {RackId})", createdRack.Code, createdRack.Id);
            return CreatedAtAction(nameof(GetById), new { id = createdRack.Id }, createdRack);
        }
        catch (InvalidOperationException ex)
        {
            // Rack code already exists or validation failed
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Updates an existing rack's configuration.
    /// <para>
    /// NOTE: The service layer performs strict validation. If the new configuration
    /// conflicts with items currently stored in the rack, an exception is thrown.
    /// </para>
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Roles = "Administrator")]
    public async Task<ActionResult<RackDto>> Update(int id, RackUpdateDto dto)
    {
        try
        {
            logger.LogInformation("Rack update initiated for ID: {RackId}", id);
            var updatedRack = await rackService.UpdateRackAsync(id, dto);
            logger.LogInformation("Rack updated successfully: {RackCode} (ID: {RackId})", updatedRack.Code, id);
            return Ok(updatedRack);
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
    /// Soft-deletes a rack from the system.
    /// Only allowed if the rack is empty.
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = "Administrator")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            logger.LogInformation("Rack deletion initiated for ID: {RackId}", id);
            await rackService.DeleteRackAsync(id);
            logger.LogInformation("Rack soft-deleted successfully. ID: {RackId}", id);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            // Cannot delete rack with items
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Bulk imports racks from a CSV file.
    /// Returns a summary of success/failure counts.
    /// </summary>
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

        logger.LogInformation("Rack CSV import initiated. Filename: {FileName}", file.FileName);

        await using var stream = file.OpenReadStream();
        var result = await rackService.ImportRacksFromCsvAsync(stream);

        logger.LogInformation("Rack CSV import completed. " +
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
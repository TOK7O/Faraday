using Faraday.API.Data;
using Faraday.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Faraday.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Administrator")]
public class SimulationController(
    IMonitoringService monitoringService,
    FaradayDbContext context,
    ILogger<SimulationController> logger)
    : ControllerBase
{
    // Manually triggers a critical temperature failure on a specific rack.
    // made to demonstrate alert generation during presentations.
    [HttpPost("trigger-temp-failure/{rackId}")]
    public async Task<IActionResult> TriggerTempFailure(int rackId)
    {
        logger.LogWarning("Manual temperature failure simulation triggered for rack ID: {RackId}", rackId);
        var rack = await context.Racks.FindAsync(rackId);
        if (rack == null) return NotFound("Rack not found");

        // Simulation: the temperature rises 15 degrees above the maximum limit
        decimal disasterTemp = rack.MaxTemperature + 15.0m;

        // Keep the weight as is (or 0 if null) to isolate the temperature anomaly
        decimal currentWeight = rack.CurrentTotalWeightKg ?? 0;

        // Send the simulated data to the Monitoring Service
        await monitoringService.ProcessRackReadingAsync(rackId, disasterTemp, currentWeight);

        logger.LogInformation("Temperature disaster simulation executed for rack: {RackCode}. Temperature: {Temperature}°C", rack.Code, disasterTemp);
        return Ok(new { message = $"Disaster triggered! Rack {rack.Code} temperature set to {disasterTemp:F1}°C (Max allowed: {rack.MaxTemperature}°C)." });
    }

    // Manually triggers a weight discrepancy (theft) on a specific rack.
    // made for demonstrating alert generation during presentations.
    [HttpPost("trigger-theft/{rackId}")]
    public async Task<IActionResult> TriggerTheft(int rackId)
    {
        logger.LogWarning("Manual theft simulation triggered for rack ID: {RackId}", rackId);
        // We need to include slots and products to calculate the expected weight
        var rack = await context.Racks
            .Include(r => r.Slots)
            .ThenInclude(s => s.CurrentItem)
            .ThenInclude(i => i!.Product)
            .FirstOrDefaultAsync(r => r.Id == rackId);

        if (rack == null) return NotFound("Rack not found");

        // Calculate what the weight should be based on database records
        decimal expectedWeight = rack.Slots
            .Where(s => s.CurrentItem != null)
            .Sum(s => s.CurrentItem!.Product.WeightKg);

        if (expectedWeight < 1)
            return BadRequest("Rack is empty or too light, cannot simulate theft effectively.");

        // Simulate theft: the sensor reads 5kg less than expected (or 0 if the total is small)
        decimal stolenWeight = Math.Max(0, expectedWeight - 5.0m);

        // Keep temperature stable (average value) to isolate the weight anomaly
        decimal currentTemp = rack.CurrentTemperature ?? (rack.MinTemperature + rack.MaxTemperature) / 2;

        // Send the simulated data to the Monitoring Service
        await monitoringService.ProcessRackReadingAsync(rackId, currentTemp, stolenWeight);

        logger.LogInformation("Theft simulation executed for rack: {RackCode}. Simulated weight: {Weight}kg (Expected: {Expected}kg)", rack.Code, stolenWeight, expectedWeight);
        return Ok(new { message = $"Theft triggered! Rack {rack.Code} weight dropped to {stolenWeight:F2}kg (Expected from DB: {expectedWeight:F2}kg)." });
    }
}
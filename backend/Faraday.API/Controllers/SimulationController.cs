using Faraday.API.Data;
using Faraday.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace Faraday.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Administrator")]
    public class SimulationController : ControllerBase
    {
        private readonly IMonitoringService _monitoringService;
        private readonly FaradayDbContext _context;

        public SimulationController(IMonitoringService monitoringService, FaradayDbContext context)
        {
            _monitoringService = monitoringService;
            _context = context;
        }
        
        // Manually triggers a critical temperature failure on a specific rack.
        // made for the purpose of demonstrating alert generation during presentations.
        [HttpPost("trigger-temp-failure/{rackId}")]
        public async Task<IActionResult> TriggerTempFailure(int rackId)
        {
            var rack = await _context.Racks.FindAsync(rackId);
            if (rack == null) return NotFound("Rack not found");

            // Simulation: temperature rises 15 degrees above the maximum limit
            decimal disasterTemp = rack.MaxTemperature + 15.0m;
            
            // Keep the weight as is (or 0 if null) to isolate the temperature anomaly
            decimal currentWeight = rack.CurrentTotalWeightKg ?? 0;

            // Send the simulated data to the Monitoring Service
            await _monitoringService.ProcessRackReadingAsync(rackId, disasterTemp, currentWeight);

            return Ok(new { message = $"Disaster triggered! Rack {rack.Code} temperature set to {disasterTemp:F1}°C (Max allowed: {rack.MaxTemperature}°C)." });
        }
        
        // Manually triggers a weight discrepancy (theft) on a specific rack.
        // made for the purpose of demonstrating alert generation during presentations.
        [HttpPost("trigger-theft/{rackId}")]
        public async Task<IActionResult> TriggerTheft(int rackId)
        {
            // We need to include slots and products to calculate the expected weight
            var rack = await _context.Racks
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

            // Simulate theft: sensor reads 5kg less than expected (or 0 if total is small)
            decimal stolenWeight = Math.Max(0, expectedWeight - 5.0m);
            
            // Keep temperature stable (average value) to isolate the weight anomaly
            decimal currentTemp = rack.CurrentTemperature ?? (rack.MinTemperature + rack.MaxTemperature) / 2;

            // Send the simulated data to the Monitoring Service
            await _monitoringService.ProcessRackReadingAsync(rackId, currentTemp, stolenWeight);

            return Ok(new { message = $"Theft triggered! Rack {rack.Code} weight dropped to {stolenWeight:F2}kg (Expected from DB: {expectedWeight:F2}kg)." });
        }
    }
}
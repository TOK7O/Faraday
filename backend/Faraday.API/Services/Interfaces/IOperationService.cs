using Faraday.API.DTOs;

namespace Faraday.API.Services.Interfaces
{
    public interface IOperationService
    {
        /// <summary>
        /// Executes Inbound process: Algorithm allocation -> DB Insert -> Log.
        /// </summary>
        Task<OperationResultDto> ProcessInboundAsync(OperationInboundDto request, int userId);

        /// <summary>
        /// Executes Outbound process: FIFO Selection -> DB Remove -> Log.
        /// </summary>
        Task<OperationResultDto> ProcessOutboundAsync(OperationOutboundDto request, int userId);

        /// <summary>
        /// Moves item from current slot to a specific target slot (this is intended for manual overdrive of system 
        /// allocation in case such movement inside the warehouse is needed)
        /// Validates constraints (Size, Weight, Temp) before moving.
        /// </summary>
        Task<OperationResultDto> ProcessMovementAsync(OperationMovementDto request, int userId);

        /// <summary>
        /// Gets operation history with optional filtering.
        /// </summary>
        Task<IEnumerable<OperationLogDto>> GetOperationHistoryAsync(int? limit = null);
    }
}
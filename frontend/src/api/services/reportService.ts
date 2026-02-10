// --- Interfaces matching C# DTOs ---

export interface DashboardStatsDto {
    totalSlots: number;
    occupiedSlots: number;
    freeSlots: number;
    occupancyPercentage: number;
    totalWeightKg: number;
    totalCapacityKg: number;
    expiringItemsCount: number;
    operationsToday: number;
}

export interface InventorySummaryDto {
    productName: string;
    barcode: string;
    totalQuantity: number;
    blockedQuantity: number;
    nextExpirationDate?: string;
}

export interface FullInventoryDto {
    itemId: number;
    productId: number;
    productName: string;
    barcode: string;
    productPhotoUrl?: string;
    productWeightKg: number;
    rackCode: string;
    slotX: number;
    slotY: number;
    locationCode: string;
    status: string;
    entryDate: string;
    expirationDate?: string;
    daysUntilExpiration?: number;
    currentRackTemperature: number;
    requiredMinTemp: number;
    requiredMaxTemp: number;
    receivedByUsername: string;
    isHazardous: boolean;
    hazardClassification?: string;
}

export interface ExpiringItemDto {
    id: number;
    productName: string;
    barcode: string;
    expirationDate?: string;
    daysRemaining: number;
    locationCode: string;
}

export interface RackUtilizationDto {
    rackCode: string;
    totalSlots: number;
    occupiedSlots: number;
    slotUtilizationPercentage: number;
    maxWeightKg: number;
    currentWeightKg: number;
    weightUtilizationPercentage: number;
}

export interface TemperatureHistoryDto {
    id: number;
    rackCode: string;
    recordedTemperature: number;
    timestamp: string;
}

export interface WeightHistoryDto {
    id: number;
    rackCode: string;
    measuredWeightKg: number;
    expectedWeightKg: number;
    discrepancyKg: number;
    timestamp: string;
}

export interface AlertHistoryDto {
    id: number;
    rackCode?: string;
    message: string;
    type: string;
    isResolved: boolean;
    createdAt: string;
    resolvedAt?: string;
}

export interface ActiveAlertDto {
    id: number;
    rackCode?: string;
    message: string;
    type: string;
    createdAt: string;
    durationMinutes: number;
}

export interface RackTemperatureViolationDto {
    readingId: number;
    rackCode: string;
    recordedTemperature: number;
    allowedMinTemperature: number;
    allowedMaxTemperature: number;
    violationType: string;
    violationDegrees: number;
    timestamp: string;
}

export interface ItemTemperatureViolationDto {
    itemId: number;
    productName: string;
    barcode: string;
    rackCode: string;
    slotX: number;
    slotY: number;
    recordedTemperature: number;
    requiredMinTemperature: number;
    requiredMaxTemperature: number;
    violationType: string;
    violationDegrees: number;
    violationTimestamp: string;
}

// --- API Service ---

const ReportService = {
};

export default ReportService;

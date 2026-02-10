import axios from "@/api/axios";
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
    getDashboardStats: async () => {
        const response = await axios.get<DashboardStatsDto>("/api/report/dashboard-stats");
        return response.data;
    },

    getInventorySummary: async () => {
        const response = await axios.get<InventorySummaryDto[]>("/api/report/inventory-summary");
        return response.data;
    },

    getFullInventory: async () => {
        const response = await axios.get<FullInventoryDto[]>("/api/report/full-inventory");
        return response.data;
    },

    getExpiringItems: async (days: number = 7) => {
        const response = await axios.get<ExpiringItemDto[]>("/api/report/expiring-items", { params: { days } });
        return response.data;
    },

    getRackUtilization: async () => {
        const response = await axios.get<RackUtilizationDto[]>("/api/report/rack-utilization");
        return response.data;
    },

    getTemperatureHistory: async (params: { rackId?: number, fromDate?: string, toDate?: string, limit?: number }) => {
        const response = await axios.get<TemperatureHistoryDto[]>("/api/report/temperature-history", { params });
        return response.data;
    },

    getWeightHistory: async (params: { rackId?: number, fromDate?: string, toDate?: string, limit?: number }) => {
        const response = await axios.get<WeightHistoryDto[]>("/api/report/weight-history", { params });
        return response.data;
    },

    getAlertHistory: async (params: { rackId?: number, fromDate?: string, toDate?: string }) => {
        const response = await axios.get<AlertHistoryDto[]>("/api/report/alert-history", { params });
        return response.data;
    },

    getActiveAlerts: async () => {
        const response = await axios.get<ActiveAlertDto[]>("/api/report/active-alerts");
        return response.data;
    },

    getRackTemperatureViolations: async (params: { rackId?: number, fromDate?: string, toDate?: string, limit?: number }) => {
        const response = await axios.get<RackTemperatureViolationDto[]>("/api/report/rack-temperature-violations", { params });
        return response.data;
    },

    getItemTemperatureViolations: async (params: { fromDate?: string, toDate?: string }) => {
        const response = await axios.get<ItemTemperatureViolationDto[]>("/api/report/item-temperature-violations", { params });
        return response.data;
    }
};

export default ReportService;


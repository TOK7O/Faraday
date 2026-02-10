import axios from 'axios';

// Create an Axios instance
const instance = axios.create({
    // Use environment variable or fallback to localhost
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- 1. Request Interceptor ---
// Automatically adds the JWT Token to every request
instance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// --- 2. Response Interceptor ---
// Automatically logs the user out if the API says "401 Unauthorized"
instance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            // Optional: Redirect to login page
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

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

// --- API ENDPOINTS ---

// 1. Report Endpoints (przeniesione z reportService)
export const getDashboardStats = async () => {
    const response = await instance.get("/api/report/dashboard-stats");
    return response.data;
};
export const getInventorySummary = async () => {
    const response = await instance.get("/api/report/inventory-summary");
    return response.data;
};
export const getFullInventory = async () => {
    const response = await instance.get("/api/report/full-inventory");
    return response.data;
};
export const getExpiringItems = async (days = 7) => {
    const response = await instance.get("/api/report/expiring-items", { params: { days } });
    return response.data;
};
export const getRackUtilization = async () => {
    const response = await instance.get("/api/report/rack-utilization");
    return response.data;
};
export const getTemperatureHistory = async (params: Record<string, any>) => {
    const response = await instance.get("/api/report/temperature-history", { params });
    return response.data;
};
export const getWeightHistory = async (params: Record<string, any>) => {
    const response = await instance.get("/api/report/weight-history", { params });
    return response.data;
};
export const getAlertHistory = async (params: Record<string, any>) => {
    const response = await instance.get("/api/report/alert-history", { params });
    return response.data;
};
export const getActiveAlerts = async () => {
    const response = await instance.get("/api/report/active-alerts");
    return response.data;
};
export const getRackTemperatureViolations = async (params: Record<string, any>) => {
    const response = await instance.get("/api/report/rack-temperature-violations", { params });
    return response.data;
};
export const getItemTemperatureViolations = async (params: Record<string, any>) => {
    const response = await instance.get("/api/report/item-temperature-violations", { params });
    return response.data;
};

// 2. Preferences/2FA Endpoints
export const get2faStatus = async () => {
    const response = await instance.get("/api/Auth/2fa/status");
    return response.data;
};
export const setup2fa = async () => {
    const response = await instance.post("/api/Auth/2fa/setup");
    return response.data;
};
export const enable2fa = async (code: string) => {
    const response = await instance.post("/api/Auth/2fa/enable", { code });
    return response.data;
};
export const disable2fa = async () => {
    const response = await instance.post("/api/Auth/2fa/disable");
    return response.data;
};

// 3. Inventory Endpoints (Rack, Product, Operation)
export const getRacks = async () => {
    const response = await instance.get("/api/Rack");
    return response.data;
};
export const getProducts = async () => {
    const response = await instance.get("/api/Product");
    return response.data;
};
export const getFullInventoryList = async () => {
    const response = await instance.get("/api/Report/full-inventory");
    return response.data;
};
export const createRack = async (dto: Record<string, any>) => {
    const response = await instance.post("/api/Rack", dto);
    return response.data;
};
export const updateRack = async (id: number | string, dto: Record<string, any>) => {
    const response = await instance.put(`/api/Rack/${id}`, dto);
    return response.data;
};
export const deleteRack = async (id: number | string) => {
    const response = await instance.delete(`/api/Rack/${id}`);
    return response.data;
};
export const createProduct = async (dto: Record<string, any>) => {
    const response = await instance.post("/api/Product", dto);
    return response.data;
};
export const updateProduct = async (id: number | string, dto: Record<string, any>) => {
    const response = await instance.put(`/api/Product/${id}`, dto);
    return response.data;
};
export const deleteProduct = async (id: number | string) => {
    const response = await instance.delete(`/api/Product/${id}`);
    return response.data;
};
// Operacje magazynowe
export const inboundOperation = async (barcode: string) => {
    const response = await instance.post("/api/Operation/inbound", { barcode });
    return response.data;
};
export const outboundOperation = async (barcode: string) => {
    const response = await instance.post("/api/Operation/outbound", { barcode });
    return response.data;
};
export const moveOperation = async (dto: Record<string, any>) => {
    const response = await instance.post("/api/Operation/move", dto);
    return response.data;
};

// Importy CSV (Rack/Product) - POST/PUT
export const importRack = async (dto: Record<string, any>) => {
    const response = await instance.post("/api/Rack", dto);
    return response.data;
};
export const updateRackImport = async (id: number | string, dto: Record<string, any>) => {
    const response = await instance.put(`/api/Rack/${id}`, dto);
    return response.data;
};
export const importProduct = async (dto: Record<string, any>) => {
    const response = await instance.post("/api/Product", dto);
    return response.data;
};
export const updateProductImport = async (id: number | string, dto: Record<string, any>) => {
    const response = await instance.put(`/api/Product/${id}`, dto);
    return response.data;
};
// Operacje historyczne
export const getOperationHistory = async (limit: number = 50) => {
    const response = await instance.get(`/api/Operation/history?limit=${limit}`);
    return response.data;
};
// Zmiana hasła
export const changePassword = async (oldPassword: string, newPassword: string) => {
    const response = await instance.post("/api/Auth/change-password", { oldPassword, newPassword });
    return response.data;
};

// --- Auth ---
export const login = async (username: string, password: string, twoFactorCode: string = "") => {
    const response = await instance.post("/api/Auth/login", { username, password, twoFactorCode });
    return response;
};

// --- Register ---
export const register = async (username: string, email: string, password: string) => {
    const response = await instance.post("/api/Auth/register", { username, email, password });
    return response;
};

// --- Backups ---
export const getBackupHistory = async () => {
    const response = await instance.get("/api/Backup/history");
    return response.data;
};
export const createBackup = async () => {
    const response = await instance.post("/api/Backup/create");
    return response.data;
};
export const downloadBackup = async (fileName: string) => {
    const response = await instance.get(`/api/Backup/download/${fileName}`, { responseType: 'blob' });
    return response.data;
};
export const restoreBackup = async (fileName: string) => {
    const response = await instance.post(`/api/Backup/restore/${fileName}`);
    return response.data;
};

// --- Password Reset ---
export const forgotPassword = async (email: string) => {
    return await instance.post("/api/Auth/forgot-password", { email });
};
export const resetPassword = async (token: string, newPassword: string) => {
    return await instance.post("/api/Auth/reset-password", { token, newPassword });
};

export default instance;
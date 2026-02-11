import axios from "axios";

const instance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:5001",
    headers: {
        "Content-Type": "application/json",
    },
});

instance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);

instance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem("token");
            if (window.location.pathname !== "/login") {
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    },
);

// --- ISTNIEJĄCE ENDPOINTY ---
export const getDashboardStats = async () => (await instance.get("/api/report/dashboard-stats")).data;
export const getInventorySummary = async () => (await instance.get("/api/report/inventory-summary")).data;
export const getFullInventory = async () => (await instance.get("/api/report/full-inventory")).data;
export const getExpiringItems = async (days = 7) => (await instance.get("/api/report/expiring-items", { params: { days } })).data;
export const getRackUtilization = async () => (await instance.get("/api/report/rack-utilization")).data;
export const getTemperatureHistory = async (params: Record<string, any>) => (await instance.get("/api/report/temperature-history", { params })).data;
export const getWeightHistory = async (params: Record<string, any>) => (await instance.get("/api/report/weight-history", { params })).data;
export const getAlertHistory = async (params: Record<string, any>) => (await instance.get("/api/report/alert-history", { params })).data;
export const getActiveAlerts = async () => (await instance.get("/api/report/active-alerts")).data;
export const getRackTemperatureViolations = async (params: Record<string, any>) => (await instance.get("/api/report/rack-temperature-violations", { params })).data;
export const getItemTemperatureViolations = async (params: Record<string, any>) => (await instance.get("/api/report/item-temperature-violations", { params })).data;
export const get2faStatus = async () => (await instance.get("/api/Auth/2fa/status")).data;
export const setup2fa = async () => (await instance.post("/api/Auth/2fa/setup")).data;
export const enable2fa = async (code: string) => (await instance.post("/api/Auth/2fa/enable", { code })).data;
export const disable2fa = async () => (await instance.post("/api/Auth/2fa/disable")).data;
export const getRacks = async () => (await instance.get("/api/Rack")).data;
export const getProducts = async () => (await instance.get("/api/Product")).data;
export const getFullInventoryList = async () => (await instance.get("/api/Report/full-inventory")).data;
export const createRack = async (dto: Record<string, any>) => (await instance.post("/api/Rack", dto)).data;
export const updateRack = async (id: number | string, dto: Record<string, any>) => (await instance.put(`/api/Rack/${id}`, dto)).data;
export const deleteRack = async (id: number | string) => (await instance.delete(`/api/Rack/${id}`)).data;
export const createProduct = async (dto: Record<string, any>) => (await instance.post("/api/Product", dto)).data;
export const updateProduct = async (id: number | string, dto: Record<string, any>) => (await instance.put(`/api/Product/${id}`, dto)).data;
export const deleteProduct = async (id: number | string) => (await instance.delete(`/api/Product/${id}`)).data;
export const inboundOperation = async (barcode: string) => (await instance.post("/api/Operation/inbound", { barcode })).data;
export const outboundOperation = async (barcode: string) => (await instance.post("/api/Operation/outbound", { barcode })).data;
export const moveOperation = async (dto: Record<string, any>) => (await instance.post("/api/Operation/move", dto)).data;
export const importRack = async (dto: Record<string, any>) => (await instance.post("/api/Rack", dto)).data;
export const updateRackImport = async (id: number | string, dto: Record<string, any>) => (await instance.put(`/api/Rack/${id}`, dto)).data;
export const importProduct = async (dto: Record<string, any>) => (await instance.post("/api/Product", dto)).data;
export const updateProductImport = async (id: number | string, dto: Record<string, any>) => (await instance.put(`/api/Product/${id}`, dto)).data;
export const getOperationHistory = async (limit: number = 50) => (await instance.get(`/api/Operation/history?limit=${limit}`)).data;
export const changePassword = async (oldPassword: string, newPassword: string) => (await instance.post("/api/Auth/change-password", { oldPassword, newPassword })).data;
export const login = async (username: string, password: string, twoFactorCode: string = "") => await instance.post("/api/Auth/login", { username, password, twoFactorCode });
export const refreshToken = async () => (await instance.post("/api/Auth/refresh-token")).data;
export const getBackupHistory = async () => (await instance.get("/api/Backup/history")).data;
export const createBackup = async () => (await instance.post("/api/Backup/create")).data;
export const downloadBackup = async (fileName: string) => (await instance.get(`/api/Backup/download/${fileName}`, { responseType: "blob" })).data;
export const restoreBackup = async (fileName: string) => (await instance.post(`/api/Backup/restore/${fileName}`)).data;
export const forgotPassword = async (email: string) => await instance.post("/api/Auth/forgot-password", { email });
export const resetPassword = async (token: string, newPassword: string) => await instance.post("/api/Auth/reset-password", { token, newPassword });
export const getRecentLogs = async (count: number = 500) => (await instance.get("/api/Logs/recent", { params: { count } })).data;
export const clearLogs = async () => (await instance.delete("/api/Logs/clear")).data;
export const getAllUsers = async () => (await instance.get("/api/Auth/users")).data;
export const registerUser = async (dto: Record<string, any>) => (await instance.post("/api/Auth/register", dto)).data;
export const updateUser = async (targetUserId: number, dto: Record<string, any>) => (await instance.put(`/api/Auth/users/${targetUserId}`, dto)).data;
export const deleteUser = async (targetUserId: number) => (await instance.delete(`/api/Auth/users/${targetUserId}`)).data;
export const resetUserPassword = async (targetUserId: number, newPassword: string) => (await instance.post(`/api/Auth/users/${targetUserId}/reset-password`, { newPassword })).data;
export const resetUser2FA = async (targetUserId: number) => (await instance.post(`/api/Auth/users/${targetUserId}/reset-2fa`)).data;
export const sendVoiceCommand = async (commandText: string) => {
    const response = await instance.post("/api/Voice/command", { commandText });
    return response.data;
};

// --- IMAGE RECOGNITION ENDPOINTS ---

export const uploadReferenceImages = async (scanCode: string, files: File[]) => {
    const formData = new FormData();
    formData.append("ScanCode", scanCode);
    files.forEach((file) => {
        formData.append("Images", file);
    });

    // Fix: Override Content-Type for multipart/form-data
    return (await instance.post("/api/ImageRecognition/upload-reference", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    })).data;
};

export const recognizeProduct = async (file: File) => {
    const formData = new FormData();
    formData.append("Image", file);

    // Fix: Override Content-Type for multipart/form-data
    return (await instance.post("/api/ImageRecognition/recognize", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    })).data;
};

export const getReferenceImages = async (productId: number) => {
    return (await instance.get(`/api/ImageRecognition/references/product/${productId}`)).data;
};

export const deleteReferenceImage = async (imageId: number) => {
    return (await instance.delete(`/api/ImageRecognition/reference/${imageId}`)).data;
};

export const getReferenceImageCount = async (productId: number) => {
    return (await instance.get(`/api/ImageRecognition/references/count/${productId}`)).data;
};

export default instance;
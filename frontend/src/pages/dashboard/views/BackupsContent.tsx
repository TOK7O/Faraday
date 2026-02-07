import { useState } from "react";
import { Database, Plus, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const BackupsContent = () => {
    const { t } = useTranslation();
    const backupT = t.dashboardPage.content.backups; // Ensure this path exists in your translations

    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleCreateBackup = async () => {
        setIsLoading(true);
        setStatus(null);

        try {
            // 1. Get Token
            // Ensure you are using the correct key (e.g., "token", "jwt", "accessToken")
            const token = localStorage.getItem("token");

            if (!token) {
                throw new Error("Authentication token missing. Please log in again.");
            }

            // 2. Perform Request
            const response = await fetch(`${API_BASE_URL}/api/Backup/create`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            // 3. Handle Errors (The "Best Practice" Way)
            if (!response.ok) {
                // Try to parse the error as JSON, fallback to text, then fallback to status code
                let errorMessage = `Error ${response.status}: Failed to create backup`;
                try {
                    const contentType = response.headers.get("content-type");
                    if (contentType && contentType.includes("application/json")) {
                        const errorData = await response.json();
                        // Adjust 'message' based on what your backend actually returns
                        errorMessage = errorData.message || errorData.error || errorMessage;
                    } else {
                        const errorText = await response.text();
                        if (errorText) errorMessage = errorText;
                    }
                } catch (e) {
                    console.error("Failed to parse error response", e);
                }

                throw new Error(errorMessage);
            }

            // 4. Success
            const data = await response.json();
            setStatus({
                type: 'success',
                message: `Backup created successfully: ${data.fileName}`
            });

        } catch (error: any) {
            console.error("Backup operation failed:", error);
            setStatus({
                type: 'error',
                message: error.message || "An unexpected network error occurred."
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="standard-view">
            <header className="content-header">
                <div className="header-brand">
                    <div className="system-tag">
                        <Database size={14} className="icon-glow" />
                        <span>System Administration</span>
                    </div>
                    <h1>{backupT?.title || "System Backups"}</h1>
                    <p className="lead-text">{backupT?.description || "Manage full system snapshots and restoration points."}</p>
                </div>
            </header>

            <div className="action-bar" style={{ marginTop: '2rem' }}>
                <button
                    className="btn-primary-ht"
                    onClick={handleCreateBackup}
                    disabled={isLoading}
                >
                    {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <Plus size={18} />}
                    <span>{isLoading ? "Processing..." : (backupT?.createButton || "Create New Backup")}</span>
                </button>
            </div>

            {status && (
                <div className={`status-message-ht ${status.type}`} style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                    background: status.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${status.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    color: status.type === 'success' ? '#4ade80' : '#f87171',
                    fontSize: '0.95rem',
                    fontWeight: 500
                }}>
                    {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span>{status.message}</span>
                </div>
            )}

            <div className="placeholder-card" style={{ marginTop: '2rem' }}>
                <h3>{backupT?.history || "Backup History"}</h3>
                <p style={{ opacity: 0.6 }}>{backupT?.noBackups || "No previous backups found locally."}</p>
            </div>
        </div>
    );
};

export default BackupsContent;
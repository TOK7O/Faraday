import { useState, useEffect } from "react";
import { Database, Plus, RefreshCw, CheckCircle2, AlertCircle, Download, FileArchive } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface BackupHistoryItem {
    fileName: string;
    sizeBytes: number;
    createdAt: string;
}

const BackupsContent = () => {
    const { t } = useTranslation();
    const backupT = t.dashboardPage.content.backups;

    const [isLoading, setIsLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [history, setHistory] = useState<BackupHistoryItem[]>([]);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/Backup/history`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setHistory(data);
            }
        } catch (error) {
            console.error("Failed to fetch backup history:", error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleCreateBackup = async () => {
        setIsLoading(true);
        setStatus(null);

        try {
            const token = localStorage.getItem("token");
            //if (!token) throw new Error("Authentication token missing.");

            const response = await fetch(`${API_BASE_URL}/api/Backup/create`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                let errorMessage = `Error ${response.status}: Failed to create backup`;
                try {
                    const contentType = response.headers.get("content-type");
                    if (contentType && contentType.includes("application/json")) {
                        const errorData = await response.json();
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

            const data = await response.json();
            setStatus({
                type: 'success',
                message: `${backupT?.success || "Backup created successfully"}: ${data.fileName}`
            });
            
            // Refresh history
            fetchHistory();

        } catch (error: any) {
            console.error("Backup operation failed:", error);
            setStatus({
                type: 'error',
                message: error.message || (backupT?.error || "An unexpected error occurred.")
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async (fileName: string) => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/Backup/download/${fileName}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error("Download failed:", error);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

            <div className="history-section" style={{ marginTop: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                    <RefreshCw 
                        size={18} 
                        className={historyLoading ? "animate-spin" : ""} 
                        style={{ cursor: 'pointer', opacity: 0.7 }}
                        onClick={fetchHistory}
                    />
                    <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{backupT?.history || "Backup History"}</h2>
                </div>

                {history.length > 0 ? (
                    <div className="glass-table-wrapper">
                        <table className="ht-table">
                            <thead>
                                <tr>
                                    <th>{backupT?.fileName || "File Name"}</th>
                                    <th>{backupT?.size || "Size"}</th>
                                    <th>{backupT?.date || "Created at"}</th>
                                    <th className="text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((item) => (
                                    <tr key={item.fileName}>
                                        <td className="name-col">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <FileArchive size={16} style={{ color: 'var(--accent-primary)' }} />
                                                {item.fileName}
                                            </div>
                                        </td>
                                        <td>{formatSize(item.sizeBytes)}</td>
                                        <td>{new Date(item.createdAt).toLocaleString()}</td>
                                        <td className="text-right">
                                            <button 
                                                className="btn-action-ht" 
                                                onClick={() => handleDownload(item.fileName)}
                                                title={backupT?.download || "Download"}
                                            >
                                                <Download size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="placeholder-card">
                        <p style={{ opacity: 0.6 }}>{historyLoading ? "Loading history..." : (backupT?.noBackups || "No previous backups found locally.")}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BackupsContent;
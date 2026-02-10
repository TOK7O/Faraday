import { useState, useEffect } from "react";
import { Database, Plus, RefreshCw, CheckCircle2, AlertCircle, Download, FileArchive, AlertTriangle } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { getBackupHistory, createBackup, downloadBackup, restoreBackup } from '@/api/axios';
import "./BackupsContent.scss"

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
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreModalOpen, setRestoreModalOpen] = useState(false);
    const [selectedBackup, setSelectedBackup] = useState<BackupHistoryItem | null>(null);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setHistoryLoading(true);
        try {
            const data = await getBackupHistory();

            // Filtrujemy wpisy, odrzucając te, które zaczynają się od "RESTORE:"
            const validBackups = data.filter((item: BackupHistoryItem) =>
                !item.fileName.startsWith("RESTORE:")
            );

            setHistory(validBackups);
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
            const data = await createBackup();
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
            const blob = await downloadBackup(fileName);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
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

    // --- LOGIKA PRZYWRACANIA ---
    const handleRestoreClick = (backup: BackupHistoryItem) => {
        setSelectedBackup(backup);
        setRestoreModalOpen(true);
    };

    const confirmRestore = async () => {
        if (!selectedBackup) return;
        try {
            setIsRestoring(true);
            await restoreBackup(selectedBackup.fileName);
            alert("Baza danych została pomyślnie przywrócona! Nastąpi wylogowanie w celu odświeżenia sesji.");
            localStorage.removeItem("token");
            window.location.href = "/login";
        } catch (error: any) {
            alert(`Błąd przywracania: ${error.message}`);
        } finally {
            setIsRestoring(false);
            setRestoreModalOpen(false);
            setSelectedBackup(null);
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
                                            <button
                                                className="btn-action-ht btn-danger"
                                                onClick={() => handleRestoreClick(item)}
                                                title="Przywróć bazę z tego pliku"
                                                style={{ color: 'red', marginLeft: '10px' }}
                                            >
                                                <Database size={18} />
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
            {/* --- MODAL POTWIERDZENIA --- */}
            {restoreModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content danger-modal">
                        <div className="modal-header">
                            <AlertTriangle color="red" size={32} />
                            <h3>Potwierdź przywracanie</h3>
                        </div>
                        <div className="modal-body">
                            <p>Czy na pewno chcesz przywrócić bazę danych z pliku:</p>
                            <p><strong>{selectedBackup?.fileName}</strong>?</p>
                            <div className="warning-box" style={{background: '#ffe6e6', padding: '10px', border: '1px solid red', margin: '15px 0'}}>
                                <strong>UWAGA:</strong>
                                <ul>
                                    <li>Ta operacja <strong>nadpisze</strong> wszystkie obecne dane.</li>
                                    <li>Wszystkie aktywne sesje zostaną zerwane.</li>
                                    <li>Tej operacji nie można cofnąć.</li>
                                </ul>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn-cancel"
                                onClick={() => setRestoreModalOpen(false)}
                                disabled={isRestoring}
                            >
                                Anuluj
                            </button>
                            <button
                                className="btn-confirm-danger"
                                onClick={confirmRestore}
                                disabled={isRestoring}
                                style={{ background: 'red', color: 'white' }}
                            >
                                {isRestoring ? "Przywracanie..." : "Tak, przywróć bazę"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BackupsContent;
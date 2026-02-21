import { useState, useEffect, useCallback } from "react";
import {
  Database,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download,
  AlertTriangle,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import {
  getBackupHistory,
  createBackup,
  downloadBackup,
  restoreBackup,
} from "@/api/axios";
import "./BackupsContent.scss";

interface BackupHistoryItem {
  fileName: string;
  sizeBytes: number;
  createdAt: string;
}

const BackupsContent = () => {
  const { t } = useTranslation();
  const backupT: any = t.dashboardPage.content.backups;

  const [isLoading, setIsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<BackupHistoryItem[]>([]);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] =
    useState<BackupHistoryItem | null>(null);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await getBackupHistory();
      const validBackups = data.filter(
        (item: BackupHistoryItem) => !item.fileName.startsWith("RESTORE:"),
      );
      setHistory(validBackups);
    } catch (error) {
      console.error("Failed to fetch backup history:", error);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleCreateBackup = async () => {
    setIsLoading(true);
    setStatus(null);
    try {
      const data = await createBackup();
      setStatus({
        type: "success",
        message: `${backupT.success || "Backup created successfully"}: ${data.fileName}`,
      });
      await fetchHistory();
    } catch (error: any) {
      setStatus({
        type: "error",
        message:
          error.message || backupT.error || "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (fileName: string) => {
    try {
      const blob = await downloadBackup(fileName);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
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
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleRestoreClick = (backup: BackupHistoryItem) => {
    setSelectedBackup(backup);
    setRestoreModalOpen(true);
  };

  const confirmRestore = async () => {
    if (!selectedBackup) return;
    try {
      setIsRestoring(true);
      await restoreBackup(selectedBackup.fileName);
      localStorage.removeItem("token");
      window.location.href = "/login?msg=restored";
    } catch (error: any) {
      alert(`${backupT.restore.error}: ${error.message}`);
    } finally {
      setIsRestoring(false);
      setRestoreModalOpen(false);
    }
  };

  return (
    <div className="backups-view-container">
      <header className="content-header">
        <div className="header-brand">
          <div className="system-tag">
            <ShieldCheck size={14} className="icon-glow" />
            <span>Security & Redundancy</span>
          </div>
          <h1>{backupT.title}</h1>
        </div>

        <div className="header-actions">
          <button
            className="btn-ht primary-glow"
            onClick={handleCreateBackup}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <Plus size={18} />
            )}
            <span>{isLoading ? backupT.generating : backupT.initBackup}</span>
          </button>
        </div>
      </header>

      <main className="backups-content">
        {status && (
          <div className={`status-alert glass-card ${status.type}`}>
            {status.type === "success" ? (
              <CheckCircle2 size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <div className="alert-text">
              <strong>
                {backupT.statusMapping?.[status.type] || status.type}
              </strong>
              <p>{status.message}</p>
            </div>
            <button className="close-alert" onClick={() => setStatus(null)}>
              ×
            </button>
          </div>
        )}

        <section className="history-wrapper glass-table-wrapper">
          <div className="table-header-bento">
            <div className="title-group">
              <Clock size={18} className="text-accent" />
              <h2>{backupT.snapshotHistory}</h2>
            </div>
            <button
              className="btn-icon"
              onClick={fetchHistory}
              disabled={historyLoading}
            >
              <RefreshCw
                size={16}
                className={historyLoading ? "animate-spin" : ""}
              />
            </button>
          </div>

          <div className="scrollable-table">
            <table className="ht-table">
              <thead>
                <tr>
                  <th>{backupT.table.name}</th>
                  <th>{backupT.table.size}</th>
                  <th>{backupT.table.created}</th>
                  <th className="text-right">{backupT.table.ops}</th>
                </tr>
              </thead>
              <tbody>
                {history.length > 0 ? (
                  history.map((item) => (
                    <tr key={item.fileName}>
                      <td className="name-col">
                        <div className="file-info">
                          <span>{item.fileName}</span>
                        </div>
                      </td>
                      <td className="mono-text">
                        {formatSize(item.sizeBytes)}
                      </td>
                      <td className="time-col">
                        <span className="date">
                          {new Date(item.createdAt).toLocaleDateString()},&nbsp;
                        </span>
                        <span className="time">
                          {new Date(item.createdAt).toLocaleTimeString()}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="action-cell">
                          <button
                            className="btn-icon"
                            onClick={() => handleDownload(item.fileName)}
                          >
                            <Download size={18} />
                          </button>
                          <button
                            className="btn-icon danger"
                            onClick={() => handleRestoreClick(item)}
                          >
                            <Database size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="empty-row">
                      {historyLoading ? backupT.scanning : backupT.noBackups}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {restoreModalOpen && (
        <div
          className="dialog-overlay-ht"
          onClick={() => !isRestoring && setRestoreModalOpen(false)}
        >
          <div
            className="dialog-content-ht danger-theme"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-accent-line" />
            <div className="modal-header">
              <div className="title-group">
                <AlertTriangle size={32} className="text-danger" />
                <div>
                  <h2>{backupT.restore.title}</h2>
                  <p>{backupT.restore.critical}</p>
                </div>
              </div>
            </div>

            <div className="modal-body">
              <div className="target-file">
                <label>{backupT.restore.target}&nbsp;</label>
                <code>{selectedBackup?.fileName}</code>
              </div>

              <div className="warning-panel">
                <div className="warning-header">
                  <AlertTriangle size={16} />
                  <span>{backupT.restore.warningTitle}</span>
                </div>
                <ul>
                  <li>{backupT.restore.warning1}</li>
                  <li>{backupT.restore.warning2}</li>
                  <li>{backupT.restore.warning3}</li>
                </ul>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setRestoreModalOpen(false)}
                disabled={isRestoring}
              >
                {backupT.restore.cancel}
              </button>
              <button
                className="btn-submit-ht danger"
                onClick={confirmRestore}
                disabled={isRestoring}
              >
                {isRestoring ? (
                  <RefreshCw className="animate-spin" />
                ) : (
                  backupT.restore.confirm
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupsContent;

import { useEffect, useState, useRef, useCallback } from 'react';
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { getRecentLogs, clearLogs } from "@/api/axios";
import { useTranslation } from "@/context/LanguageContext";
import {
    Terminal, Trash2, PauseCircle, PlayCircle,
    Search, Filter, Wifi, WifiOff, RefreshCw,
    ChevronLeft, ChevronRight, Activity
} from 'lucide-react';
import "./LogsContent.scss";

export interface LogEntry {
    timestamp: string;
    level: string;
    category: string;
    message: string;
    exception?: string;
    eventId: number;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";
const HUB_URL = `${API_URL}/hubs/logs`;

const LogsContent = () => {
    const { t } = useTranslation();

    // Data State
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    // Filters & Pagination
    const [filterLevel, setFilterLevel] = useState<string>("All");
    const [searchText, setSearchText] = useState("");
    const [itemsPerPage, setItemsPerPage] = useState<number>(50);
    const [currentPage, setCurrentPage] = useState<number>(1);

    const connectionRef = useRef<HubConnection | null>(null);

    const initSignalR = useCallback(async () => {
        const token = localStorage.getItem("token");
        const newConnection = new HubConnectionBuilder()
            .withUrl(HUB_URL, { accessTokenFactory: () => token || "" })
            .withAutomaticReconnect()
            .configureLogging(LogLevel.Warning)
            .build();

        newConnection.on("ReceiveLogHistory", (historyLogs: LogEntry[]) => {
            setLogs(historyLogs.slice().reverse());
        });

        newConnection.on("ReceiveLogs", (newLogs: LogEntry[]) => {
            if (isPaused) return;
            setLogs(prevLogs => {
                const reversedNewLogs = newLogs.slice().reverse();
                return [...reversedNewLogs, ...prevLogs].slice(0, 2000);
            });
        });

        try {
            await newConnection.start();
            setIsConnected(true);
        } catch (err) {
            setIsConnected(false);
        }

        newConnection.onclose(() => setIsConnected(false));
        newConnection.onreconnected(() => setIsConnected(true));
        connectionRef.current = newConnection;
    }, [isPaused]);

    useEffect(() => {
        initSignalR();
        return () => { connectionRef.current?.stop(); };
    }, [initSignalR]);

    useEffect(() => { setCurrentPage(1); }, [filterLevel, searchText, itemsPerPage]);

    const getLevelClass = (level: string) => {
        const l = level?.toLowerCase() || "";
        if (l.includes("inf")) return "info";
        if (l.includes("warn")) return "warn";
        if (l.includes("err")) return "error";
        if (l.includes("crit") || l.includes("fatal")) return "crit";
        return "";
    };

    const formatTime = (ts: string) => {
        if (!ts) return "-";
        const d = new Date(ts);
        return d.toLocaleTimeString('pl-PL', { hour12: false }) + '.' + d.getMilliseconds().toString().padStart(3, '0');
    };

    const filteredLogs = logs.filter(log => {
        if (filterLevel !== "All") {
            const level = log.level || "";
            if (filterLevel === "Error" && !["Error", "Critical", "Fatal"].includes(level)) return false;
            if (filterLevel === "Warning" && !["Warning", "Error", "Critical", "Fatal"].includes(level)) return false;
        }
        if (searchText) {
            const s = searchText.toLowerCase();
            return log.message?.toLowerCase().includes(s) || log.category?.toLowerCase().includes(s);
        }
        return true;
    });

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const currentLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="logs-view-container">

            <header className="content-header">
                <div className="header-brand">
                    <div className="system-tag">
                        <Activity size={14} className="icon-glow" />
                        <span>Real-time Terminal</span>
                    </div>
                    <h1>
                        System <span className="outline-text">Logs</span>
                    </h1>
                </div>

                <div className="header-status">
                    <div className={`status-pill ${isConnected ? 'connected' : 'disconnected'}`}>
                        <span className="status-dot"></span>
                        {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
                        <span>{isConnected ? "Live Sync" : "Connection Lost"}</span>
                    </div>
                </div>
            </header>

            <div className="action-bar-bento">
                <div className="control-group glass-card">
                    <div className="search-container">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search packets..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    </div>
                    <div className="filter-wrapper">
                        <Filter size={16} />
                        <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
                            <option value="All">All Levels</option>
                            <option value="Information">Info & Up</option>
                            <option value="Warning">Warning & Up</option>
                            <option value="Error">Errors Only</option>
                        </select>
                    </div>
                </div>

                <div className="button-group glass-card">
                    <button className={`btn-ht ${isPaused ? 'paused-active' : ''}`} onClick={() => setIsPaused(!isPaused)}>
                        {isPaused ? <PlayCircle size={18}/> : <PauseCircle size={18}/>}
                        <span>{isPaused ? "Resume" : "Pause"}</span>
                    </button>
                    <button className="btn-ht" onClick={() => initSignalR()}><RefreshCw size={18} /></button>
                    <button className="btn-ht danger" onClick={async () => { if(confirm("Clear logs?")) { await clearLogs(); setLogs([]); } }}>
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            <main className="logs-main-wrapper glass-table-wrapper">
                <div className="pagination-header">
                    <div className="page-info">
                        Showing <strong>{currentLogs.length}</strong> entries on this page
                    </div>
                    <div className="pagination-controls">
                        <button className={"btn-ht"} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                            <ChevronLeft size={18} />
                        </button>
                        <span className="current-page">Page {currentPage} / {totalPages || 1}</span>
                        <button className={"btn-ht"} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                <div className="console-display">
                    {currentLogs.length === 0 ? (
                        <div className="empty-state">
                            <Terminal size={48} />
                            <p>{isConnected ? "No data found" : "Re-establishing link..."}</p>
                        </div>
                    ) : (
                        <div className="log-rows">
                            {currentLogs.map((log, index) => (
                                <div key={index} className={`log-row ${getLevelClass(log.level)}`}>
                                    <div className="row-meta">
                                        <span className="time">{formatTime(log.timestamp)}</span>
                                        <span className="level-badge">{log.level}</span>
                                    </div>
                                    <div className="row-content">
                                        <span className="cat">{log.category?.split('.').pop()}</span>
                                        <p className="msg">{log.message}</p>
                                        {log.exception && (
                                            <div className="trace-box"><code>{log.exception}</code></div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default LogsContent;
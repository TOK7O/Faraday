import { useEffect, useState, useRef } from 'react';
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { getRecentLogs, clearLogs } from "@/api/axios";
import { useTranslation } from "@/context/LanguageContext";
import "./LogsContent.scss";
import {
    Terminal, Trash2, PauseCircle, PlayCircle,
    Search, Filter, Wifi, WifiOff, RefreshCw,
    ChevronLeft, ChevronRight
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const HUB_URL = `${API_URL}/hubs/logs`;

export interface LogEntry {
    timestamp: string;
    level: string;
    category: string;
    message: string;
    exception?: string;
    eventId: number;
}

const LogsContent = () => {
    const { t } = useTranslation();

    // Data State
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    // Filters & Pagination State
    const [filterLevel, setFilterLevel] = useState<string>("All");
    const [searchText, setSearchText] = useState("");
    const [itemsPerPage, setItemsPerPage] = useState<number>(50);
    const [currentPage, setCurrentPage] = useState<number>(1);

    // Refs
    const connectionRef = useRef<HubConnection | null>(null);

    // 1. Init SignalR
    useEffect(() => {
        const startConnection = async () => {
            await initSignalR();
        };
        startConnection();
        return () => {
            if (connectionRef.current) connectionRef.current.stop();
        };
    }, []);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterLevel, searchText, itemsPerPage]);

    const initSignalR = async () => {
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
                const updated = [...reversedNewLogs, ...prevLogs];
                return updated.slice(0, 2000);
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
    };

    const handleRefresh = async () => {
        try {
            const recent = await getRecentLogs(1000);
            setLogs(recent.slice().reverse());
        } catch (error) {}
    };

    const handleClearLogs = async () => {
        if(!confirm("Are you sure you want to clear the server-side log buffer?")) return;
        try {
            await clearLogs();
            setLogs([]);
        } catch (error) {}
    };

    // --- Logic ---
    const getLevelClass = (level: string) => {
        if (!level) return "";
        const l = level.toLowerCase();
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

    // Filter Logic
    const filteredLogs = logs.filter(log => {
        if (filterLevel !== "All") {
            const level = log.level || "";
            if (filterLevel === "Error" && !["Error", "Critical", "Fatal"].includes(level)) return false;
            if (filterLevel === "Warning" && !["Warning", "Error", "Critical", "Fatal"].includes(level)) return false;
        }
        if (searchText) {
            const searchLower = searchText.toLowerCase();
            return (
                (log.message && log.message.toLowerCase().includes(searchLower)) ||
                (log.category && log.category.toLowerCase().includes(searchLower)) ||
                (log.exception && log.exception.toLowerCase().includes(searchLower))
            );
        }
        return true;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const indexOfLastLog = currentPage * itemsPerPage;
    const indexOfFirstLog = indexOfLastLog - itemsPerPage;
    const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(prev => prev - 1);
    };

    return (
        <div className="logs-view">
            {/* Header */}
            <div className="logs-header">
                <div className="header-left">
                    <div className="system-status">
                        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
                            {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                            <span>{isConnected ? "ONLINE" : "OFFLINE"}</span>
                        </div>
                    </div>
                    <h2>
                        <Terminal size={28} className="text-accent" />
                        System Logs
                    </h2>
                </div>

                <div className="header-actions">
                    <button
                        className={`btn-header ${isPaused ? 'paused' : 'btn-secondary'}`}
                        onClick={() => setIsPaused(!isPaused)}
                    >
                        {isPaused ? <PlayCircle size={18}/> : <PauseCircle size={18}/>}
                        {isPaused ? "Resume" : "Pause"}
                    </button>
                    <button className="btn-header btn-secondary" onClick={handleRefresh} title="Manual Refresh">
                        <RefreshCw size={18} />
                    </button>
                    <button className="btn-header btn-danger" onClick={handleClearLogs}>
                        <Trash2 size={18} /> Clear
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="logs-toolbar">
                <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
                    <Filter size={16} className="text-muted" />
                    <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
                        <option value="All">All Levels</option>
                        <option value="Information">Info & above</option>
                        <option value="Warning">Warning & above</option>
                        <option value="Error">Errors only</option>
                    </select>
                </div>

                <div className="search-input">
                    <Search size={16} className="text-muted" />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                </div>
            </div>

            {/* Container wrapper dla Paginacji i Konsoli (usuwa gap) */}
            <div className="logs-container">
                {/* Pagination (Top) */}
                <div className="pagination-bar">
                    <div className="items-per-page">
                        <span>Show:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        >
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={200}>200</option>
                        </select>
                        <span>per page</span>
                    </div>

                    <div className="page-controls">
                        <button onClick={handlePrevPage} disabled={currentPage === 1}>
                            <ChevronLeft size={16} />
                        </button>
                        <span>Page {currentPage} of {totalPages || 1}</span>
                        <button onClick={handleNextPage} disabled={currentPage >= totalPages}>
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                {/* Console (Bottom) */}
                <div className="logs-console">
                    {currentLogs.length === 0 ? (
                        <div className="empty-logs">
                            {isConnected ? "No logs found." : "Connecting..."}
                        </div>
                    ) : (
                        currentLogs.map((log, index) => (
                            <div key={index} className="log-entry">
                                <span className="timestamp" title={log.timestamp}>{formatTime(log.timestamp)}</span>
                                <span className={`level ${getLevelClass(log.level)}`}>[{log.level}]</span>
                                <span className="category" title={log.category}>
                                    {log.category ? log.category.split('.').pop() : "System"}
                                </span>
                                <div className="message">
                                    {log.message}
                                    {log.exception && <pre className="exception-trace">{log.exception}</pre>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default LogsContent;
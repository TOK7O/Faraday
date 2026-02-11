import { useState, useEffect } from "react";
import {
  History,
  Search,
  RefreshCw,
  Box,
  User,
  MapPin,
  ArrowRight,
  ArrowLeft,
  RefreshCcw,
  Loader2,
} from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { getOperationHistory } from "@/api/axios";
import "./OperationsHistory.scss";

interface OperationLog {
  id: number;
  timestamp: string;
  type: string;
  userName: string;
  productName: string | null;
  rackCode: string | null;
  description: string;
}

const OperationsHistory = () => {
  const { t } = useTranslation();
  const opT = t.dashboardPage.content.operations;

  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [limit, setLimit] = useState(50);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await getOperationHistory(limit);
      setLogs(data);
    } catch (error) {
      console.error("Network error", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [limit]);

  const getOpConfig = (type: string) => {
    switch (type) {
      case "Inbound":
        return {
          color: "#10b981",
          icon: <ArrowRight size={14} />,
          label: opT.types.accepted,
        };
      case "Outbound":
        return {
          color: "#ef4444",
          icon: <ArrowLeft size={14} />,
          label: opT.types.dispatched,
        };
      case "Movement":
        return {
          color: "#f59e0b",
          icon: <RefreshCcw size={14} />,
          label: opT.types.moved,
        };
      default:
        return { color: "#64748b", icon: <History size={14} />, label: type };
    }
  };

  const filteredLogs = logs.filter(
    (log) =>
      log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.productName &&
        log.productName.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div className="operations-view-container">
      <header className="content-header">
        <div className="header-brand">
          <div className="system-tag">
            <History size={14} className="icon-glow" />
            <span>{opT.tag}</span>
          </div>
          <h1>{opT.title}</h1>
        </div>
        <div className="header-actions">
          <button className="btn-primary-ht" onClick={() => fetchHistory()}>
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            <span>{opT.sync}</span>
          </button>
        </div>
      </header>

      <div className="action-bar">
        <div className="search-container">
          <Search
            size={18}
            className="search-icon"
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              opacity: 0.5,
            }}
          />
          <input
            type="text"
            placeholder={opT.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="ht-select"
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          style={{
            background: "var(--bg-form)",
            color: "var(--text-main)",
            borderRadius: "8px",
            padding: "0 1rem",
          }}
        >
          <option value={20}>{opT.filters.last20}</option>
          <option value={50}>{opT.filters.last50}</option>
          <option value={100}>{opT.filters.last100}</option>
        </select>
      </div>

      <div className="glass-table-wrapper">
        <table className="ht-table">
          <thead>
            <tr>
              <th style={{ width: "150px" }}>{opT.table.timestamp}</th>
              <th style={{ width: "140px" }}>{opT.table.operation}</th>
              <th>{opT.table.detail}</th>
              <th>{opT.table.asset}</th>
              <th>{opT.table.operator}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  style={{ textAlign: "center", padding: "3rem", opacity: 0.5 }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                    }}
                  >
                    <Loader2 className="animate-spin" size={20} />
                    {opT.loading}
                  </div>
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{ textAlign: "center", padding: "3rem", opacity: 0.5 }}
                >
                  {opT.empty}
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const config = getOpConfig(log.type);
                return (
                  <tr key={log.id}>
                    <td>
                      <div className="time-col">
                        <span className="date">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </span>
                        <span className="time">
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div
                        className="op-badge"
                        style={{
                          borderColor: config.color,
                          color: config.color,
                          background: `${config.color}10`,
                        }}
                      >
                        {config.icon}
                        <span style={{ marginLeft: "6px" }}>
                          {config.label}
                        </span>
                      </div>
                    </td>
                    <td
                      style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}
                    >
                      {log.description}
                    </td>
                    <td>
                      <div className="detail-group">
                        {log.productName && (
                          <div className="detail-item highlight">
                            <Box size={14} />
                            <span>{log.productName}</span>
                          </div>
                        )}
                        {log.rackCode && (
                          <div className="detail-item">
                            <MapPin size={14} />
                            <span style={{ fontFamily: "monospace" }}>
                              {log.rackCode}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="detail-item">
                        <User size={14} />
                        <span>{log.userName}</span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OperationsHistory;

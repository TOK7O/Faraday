import { useState, useEffect, useRef } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { useNavigate } from "react-router-dom";
import "./Sidebar.scss";
import {
    LayoutDashboard, Package, Users, History, FileText,
    Settings, Database, LogOut, Terminal, Clock, RefreshCw, Loader2
} from "lucide-react";
import { useTranslation } from "@/context/LanguageContext.tsx";
import { refreshToken } from "@/api/axios";

import { getTokenExpirationTime, clearSession } from "@/utils/auth.utils";

const Sidebar = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const userRole = localStorage.getItem("role");
    const isAdmin = userRole === "Administrator";

    const [showExtendSession, setShowExtendSession] = useState(false);
    const [timeLeftStr, setTimeLeftStr] = useState<string>("");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const timerRef = useRef<number | null>(null);
    const countdownIntervalRef = useRef<number | null>(null);

    const checkTokenExpiration = () => {
        const expirationTime = getTokenExpirationTime();
        if (!expirationTime) return;

        const currentTime = Date.now();
        const timeUntilExpiry = expirationTime - currentTime;

        const warningThreshold = 5 * 60 * 1000;

        if (timeUntilExpiry <= warningThreshold && timeUntilExpiry > 0) {
            setShowExtendSession(true);
        } else if (timeUntilExpiry > warningThreshold) {
            const timeToWarning = timeUntilExpiry - warningThreshold;

            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                setShowExtendSession(true);
            }, timeToWarning);
        }
    };

    useEffect(() => {
        checkTokenExpiration();
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        };
    }, []);

    useEffect(() => {
        if (showExtendSession) {
            const updateCountdown = () => {
                const expirationTime = getTokenExpirationTime();

                if (!expirationTime) {
                    handleLogout();
                    return;
                }

                const now = Date.now();
                const diff = expirationTime - now;

                if (diff <= 0) {
                    handleLogout();
                } else {
                    const minutes = Math.floor(diff / 60000);
                    const seconds = Math.floor((diff % 60000) / 1000);
                    setTimeLeftStr(`${minutes}:${seconds.toString().padStart(2, '0')}`);
                }
            };

            updateCountdown();
            countdownIntervalRef.current = setInterval(updateCountdown, 1000);
        } else {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        }

        return () => {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        };
    }, [showExtendSession]);

    const handleExtendSession = async () => {
        setIsRefreshing(true);
        try {
            const response = await refreshToken();
            localStorage.setItem("token", response.token);
            setShowExtendSession(false);
            checkTokenExpiration();
        } catch (error) {
            console.error("Failed to refresh session", error);
            handleLogout();
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleLogout = () => {
        clearSession();
        navigate("/");
    };

    return (
        <div className="sidebar-container">
            <Tabs.List className="sidebar-nav">
                <div className="nav-group">
                    <span className="group-label">{t.dashboardPage.sidebar.groups.terminal}</span>
                    <Tabs.Trigger className="nav-item" value="overview">
                        <LayoutDashboard size={18} /> {t.dashboardPage.sidebar.nav.overview}
                    </Tabs.Trigger>
                    <Tabs.Trigger className="nav-item" value="inventory">
                        <Package size={18} /> {t.dashboardPage.sidebar.nav.inventory}
                    </Tabs.Trigger>
                </div>

                <div className="nav-group">
                    <span className="group-label">{t.dashboardPage.sidebar.groups.securityLogs}</span>
                    {isAdmin && (
                        <Tabs.Trigger className="nav-item" value="personnel">
                            <Users size={18} /> {t.dashboardPage.sidebar.nav.personnel}
                        </Tabs.Trigger>
                    )}
                    <Tabs.Trigger className="nav-item" value="operations">
                        <History size={18} /> {t.dashboardPage.sidebar.nav.operations}
                    </Tabs.Trigger>
                    <Tabs.Trigger className="nav-item" value="reports">
                        <FileText size={18} /> {t.dashboardPage.sidebar.nav.reports}
                    </Tabs.Trigger>
                    <Tabs.Trigger className="nav-item" value="backups">
                        <Database size={18} /> {t.dashboardPage.sidebar.nav.backups}
                    </Tabs.Trigger>
                    {isAdmin && (
                        <Tabs.Trigger className="nav-item" value="logs">
                            <Terminal size={18} /> {t.dashboardPage.sidebar.nav.logs || "System Logs"}
                        </Tabs.Trigger>
                    )}
                </div>

                <div className="nav-group">
                    <span className="group-label">{t.dashboardPage.sidebar.groups.settings}</span>
                    <Tabs.Trigger className="nav-item" value="settings">
                        <Settings size={18} /> {t.dashboardPage.sidebar.nav.settings}
                    </Tabs.Trigger>
                </div>
            </Tabs.List>

            <div className="sidebar-footer">
                {showExtendSession && (
                    <div className="session-warning" style={{
                        marginBottom: '1rem',
                        padding: '12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        color: '#ef4444'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <Clock size={16} />
                            <span style={{ fontWeight: 600 }}>Session Expiring</span>
                        </div>
                        <div style={{ marginBottom: '8px', opacity: 0.9 }}>
                            Time remaining: <strong>{timeLeftStr}</strong>
                        </div>
                        <button
                            onClick={handleExtendSession}
                            disabled={isRefreshing}
                            style={{
                                width: '100%',
                                padding: '6px',
                                background: '#ef4444',
                                border: 'none',
                                borderRadius: '4px',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                fontSize: '0.8rem',
                                fontWeight: 600
                            }}
                        >
                            {isRefreshing ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                            Extend Session
                        </button>
                    </div>
                )}

                <button className="logout-btn" onClick={handleLogout}>
                    <div className="logout-icon-wrapper">
                        <LogOut size={18} />
                    </div>
                    <span>{t.dashboardPage.sidebar.logout}</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
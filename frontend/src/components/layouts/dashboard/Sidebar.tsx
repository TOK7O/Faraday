import * as Tabs from "@radix-ui/react-tabs";
import { useNavigate } from "react-router-dom";
import "./Sidebar.scss";
import {
    LayoutDashboard,
    Package,
    Users,
    History,
    FileText,
    Settings,
    Database,
    LogOut,
    Terminal
} from "lucide-react";
import { useTranslation } from "@/context/LanguageContext.tsx";

const Sidebar = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // Pobieramy rolę z localStorage
    const userRole = localStorage.getItem("role");
    const isAdmin = userRole === "Administrator";

    // --- LOGOUT LOGIC ---
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("role");
        navigate("/login");
    };

    return (
        <div className="sidebar-container">
            <Tabs.List className="sidebar-nav">

                {/* Grupa 1: Terminal / Główne */}
                <div className="nav-group">
            <span className="group-label">
                {t.dashboardPage.sidebar.groups.terminal}
            </span>
                    <Tabs.Trigger className="nav-item" value="overview">
                        <LayoutDashboard size={18} /> {t.dashboardPage.sidebar.nav.overview}
                    </Tabs.Trigger>
                    <Tabs.Trigger className="nav-item" value="inventory">
                        <Package size={18} /> {t.dashboardPage.sidebar.nav.inventory}
                    </Tabs.Trigger>
                </div>

                {/* Grupa 2: Logi Bezpieczeństwa / Operacje */}
                <div className="nav-group">
            <span className="group-label">
                {t.dashboardPage.sidebar.groups.securityLogs}
            </span>

                    {/* ZAKŁADKA PERSONEL: Teraz widoczna tylko dla Administratora */}
                    {isAdmin && (
                        <Tabs.Trigger className="nav-item" value="personnel">
                            <Users size={18} /> {t.dashboardPage.sidebar.nav.personnel}
                        </Tabs.Trigger>
                    )}
                    <Tabs.Trigger className="nav-item" value="inventory">
                        <Package size={18} /> {t.dashboardPage.sidebar.nav.inventory}
                    </Tabs.Trigger>

                    <Tabs.Trigger className="nav-item" value="operations">
                        <History size={18} /> {t.dashboardPage.sidebar.nav.operations}
                    </Tabs.Trigger>
                    <Tabs.Trigger className="nav-item" value="reports">
                        <FileText size={18} /> {t.dashboardPage.sidebar.nav.reports}
                    </Tabs.Trigger>
                    <Tabs.Trigger className="nav-item" value="backups">
                        <Database size={18} /> {t.dashboardPage.sidebar.nav.backups}
                    </Tabs.Trigger>

                    {/* LOGI SYSTEMOWE: Tylko Admin */}
                    {isAdmin && (
                        <Tabs.Trigger className="nav-item" value="logs">
                            <Terminal size={18} />
                            {t.dashboardPage.sidebar.nav.logs || "System Logs"}
                        </Tabs.Trigger>
                    )}
                </div>

                {/* Grupa 3: Ustawienia */}
                <div className="nav-group">
            <span className="group-label">
                {t.dashboardPage.sidebar.groups.settings}
            </span>
                    <Tabs.Trigger className="nav-item" value="settings">
                        <Settings size={18} /> {t.dashboardPage.sidebar.nav.settings}
                    </Tabs.Trigger>
                </div>
            </Tabs.List>

            <div className="sidebar-footer">
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
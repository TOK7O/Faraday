import { useState } from "react";
import {
    LayoutDashboard,
    Package,
    Users,
    LogOut,
    Bell,
    Search,
    History,
    FileText,
    Palette,
    Languages,
} from "lucide-react";
import "./DashboardPage.scss";
import OverviewContent from "../../components/layouts/OverviewContent";
import InventoryContent from "../../components/layouts/InventoryContent";
import PersonnelContent from "../../components/layouts/PersonnelContent";
import ReportsContent from "../../components/layouts/ReportsContent";
import { useTranslation } from "../../context/LanguageContext";

const DashboardPage = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState("overview");

    const renderActiveComponent = () => {
        switch (activeTab) {
            case "overview":
                return <OverviewContent />;
            case "inventory":
                return <InventoryContent />;
            case "personnel":
                return <PersonnelContent />;
            case "operations":
                return <ReportsContent />;
            case "reports":
                return <div className="placeholder">{t.dashboardPage.content.reports.generator}</div>;
            default:
                return <OverviewContent />;
        }
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-grid-bg"></div>

            <aside className="dashboard-sidebar">
                <div className="sidebar-logo">
                    <span>
                        Faraday<span>Systems</span>
                    </span>
                </div>
                <nav className="sidebar-nav">
                    <div className="nav-group">
                        <span className="group-label">{t.dashboardPage.sidebar.groups.terminal}</span>
                        <button
                            className={`nav-item ${activeTab === "overview" ? "active" : ""}`}
                            onClick={() => setActiveTab("overview")}
                        >
                            <LayoutDashboard size={18} /> {t.dashboardPage.sidebar.nav.overview}
                        </button>
                        <button
                            className={`nav-item ${activeTab === "inventory" ? "active" : ""}`}
                            onClick={() => setActiveTab("inventory")}
                        >
                            <Package size={18} /> {t.dashboardPage.sidebar.nav.inventory}
                        </button>
                    </div>

                    <div className="nav-group">
                        <span className="group-label">{t.dashboardPage.sidebar.groups.securityLogs}</span>
                        <button
                            className={`nav-item ${activeTab === "personnel" ? "active" : ""}`}
                            onClick={() => setActiveTab("personnel")}
                        >
                            <Users size={18} /> {t.dashboardPage.sidebar.nav.personnel}
                        </button>
                        <button
                            className={`nav-item ${activeTab === "operations" ? "active" : ""}`}
                            onClick={() => setActiveTab("operations")}
                        >
                            <History size={18} /> {t.dashboardPage.sidebar.nav.operations}
                        </button>
                        <button
                            className={`nav-item ${activeTab === "reports" ? "active" : ""}`}
                            onClick={() => setActiveTab("reports")}
                        >
                            <FileText size={18} /> {t.dashboardPage.sidebar.nav.reports}
                        </button>
                    </div>

                    <div className="nav-group">
                        <span className="group-label">{t.dashboardPage.sidebar.groups.settings}</span>
                        <button className="nav-item">
                            <Palette size={18} /> {t.dashboardPage.sidebar.nav.theme}
                        </button>
                        <button className="nav-item">
                            <Languages size={18} /> {t.dashboardPage.sidebar.nav.language}
                        </button>
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <button className="logout-btn">
                        <LogOut size={18} /> {t.dashboardPage.sidebar.logout}
                    </button>
                </div>
            </aside>

            <main className="dashboard-main">
                <header className="dashboard-navbar">
                    <div className="navbar-left">
                        <div className="path-display">
                            {t.dashboardPage.navbar.path} / {activeTab}
                        </div>
                    </div>
                    <div className="navbar-actions">
                        <div className="search-wrapper">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder={t.dashboardPage.navbar.searchPlaceholder}
                            />
                        </div>
                        <button className="action-btn">
                            <Bell size={18} />
                            <span className="dot-alert"></span>
                        </button>
                        <div className="user-tag">
                            <span className="role">ADM</span>
                            <span className="name">Jan Nowak</span>
                        </div>
                    </div>
                </header>

                <section className="dashboard-content">
                    {renderActiveComponent()}
                </section>
            </main>
        </div>
    );
};

export default DashboardPage;

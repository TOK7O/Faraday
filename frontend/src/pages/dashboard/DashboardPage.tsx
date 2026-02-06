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
    ShieldCheck,
    Activity,
    ArrowUpRight
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
                return <div className="placeholder">Generator raportów PDF/CSV</div>;
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
                        <a href="#" className="nav-item active">
                            <LayoutDashboard size={18} /> {t.dashboardPage.sidebar.nav.overview}
                        </a>
                        <a href="#" className="nav-item">
                            <Package size={18} /> {t.dashboardPage.sidebar.nav.inventory}
                        </a>
                        <span className="group-label">Terminal</span>
                        <button
                            className={`nav-item ${activeTab === "overview" ? "active" : ""}`}
                            onClick={() => setActiveTab("overview")}
                        >
                            <LayoutDashboard size={18} /> Overview
                        </button>
                        <button
                            className={`nav-item ${activeTab === "inventory" ? "active" : ""}`}
                            onClick={() => setActiveTab("inventory")}
                        >
                            <Package size={18} /> Inventory
                        </button>
                    </div>

                    <div className="nav-group">
                        <span className="group-label">{t.dashboardPage.sidebar.groups.securityLogs}</span>
                        <a href="#" className="nav-item">
                            <Users size={18} /> {t.dashboardPage.sidebar.nav.personnel}
                        </a>
                        <a href="#" className="nav-item">
                            <History size={18} /> {t.dashboardPage.sidebar.nav.operations}
                        </a>
                        <a href="#" className="nav-item">
                            <History size={18} /> {t.dashboardPage.sidebar.nav.reports}
                        </a>
                        <span className="group-label">Security & Logs</span>
                        <button
                            className={`nav-item ${activeTab === "personnel" ? "active" : ""}`}
                            onClick={() => setActiveTab("personnel")}
                        >
                            <Users size={18} /> Personnel
                        </button>
                        <button
                            className={`nav-item ${activeTab === "operations" ? "active" : ""}`}
                            onClick={() => setActiveTab("operations")}
                        >
                            <History size={18} /> Operations
                        </button>
                        <button
                            className={`nav-item ${activeTab === "reports" ? "active" : ""}`}
                            onClick={() => setActiveTab("reports")}
                        >
                            <FileText size={18} /> Reports
                        </button>
                    </div>

                    <div className="nav-group">
                        <span className="group-label">{t.dashboardPage.sidebar.groups.settings}</span>
                        <a href="#" className="nav-item">
                            <Users size={18} /> {t.dashboardPage.sidebar.nav.theme}
                        </a>
                        <a href="#" className="nav-item">
                            <Users size={18} /> {t.dashboardPage.sidebar.nav.language}
                        </a>
                        <span className="group-label">Settings</span>
                        <button className="nav-item">
                            <Palette size={18} /> Theme
                        </button>
                        <button className="nav-item">
                            <Languages size={18} /> Language
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
                        <div className="path-display">{t.dashboardPage.navbar.path}</div>
                    </div>

                    <div className="path-display">root / dashboard / {activeTab}</div>
                    <div className="navbar-actions">
                        <div className="search-wrapper">
                            <Search size={16} />
                            <input type="text" placeholder={t.dashboardPage.navbar.searchPlaceholder} />
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
                    <div className="bento-dashboard">
                        <div className="bento-card large">
                            <div className="card-header">
                                <Activity size={16} /> {t.dashboardPage.content.realTimeThroughput}
                            </div>
                            <div className="card-body">
                                <h2>
                                    142.8 <small>ops/m</small>
                                </h2>
                                <div className="mini-graph">
                                    {[30, 50, 40, 80, 60, 90, 70].map((h, i) => (
                                        <div
                                            key={i}
                                            className="bar"
                                            style={{ height: `${h}%` }}
                                        ></div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="bento-card gray">
                            <div className="card-header">{t.dashboardPage.content.warehouseLoad}</div>
                            <div className="circle-progress">84%</div>
                        </div>

                        <div className="bento-card accent">
                            <ShieldCheck size={20} />
                            <p>{t.dashboardPage.content.securityProtocol}</p>
                            <ArrowUpRight size={16} className="corner-icon" />
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default DashboardPage;

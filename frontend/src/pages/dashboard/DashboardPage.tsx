import React, { useState } from "react";
import {
  LayoutDashboard,
  Package,
  Users,
  LogOut,
  Bell,
  Search,
  History,
  ShieldCheck,
  Activity,
  ArrowUpRight,
  FileText,
  Palette,
  Languages,
} from "lucide-react";
import "./DashboardPage.scss";

const OverviewContent = () => (
  <div className="bento-dashboard">
    <div className="bento-card large">
      <div className="card-header">
        <Activity size={16} /> Real-time Throughput
      </div>
      <div className="card-body">
        <h2>
          142.8 <small>ops/m</small>
        </h2>
        <div className="mini-graph">
          {[30, 50, 40, 80, 60, 90, 70].map((h, i) => (
            <div key={i} className="bar" style={{ height: `${h}%` }}></div>
          ))}
        </div>
      </div>
    </div>
    <div className="bento-card gray">
      <div className="card-header">Warehouse Load</div>
      <div className="circle-progress">84%</div>
    </div>
    <div className="bento-card accent">
      <ShieldCheck size={20} />
      <p>Security Protocol Active</p>
      <ArrowUpRight size={16} className="corner-icon" />
    </div>
  </div>
);

const InventoryContent = () => (
  <div className="inventory-view">
    <div className="view-header">
      <h2>System Inwentaryzacji (M x N)</h2>
      <p>Zarządzanie regałami zgodnie z zasadą FIFO</p>
    </div>
    <div className="rack-grid-container">
      <div className="rack-preview-card">
        <div className="rack-info">
          <h3>Regał R-01</h3>
          <span>Wymiary: 5 x 10 | Temp: 0 - 5°C</span>
        </div>
        <div className="slots-grid">
          {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} className="slot-pixel" title={`Slot ${i + 1}`}></div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const PersonnelContent = () => (
  <div className="standard-view">
    <h2>Zarządzanie Personelem</h2>
    <div className="placeholder-card">
      Lista operatorów z aktywnym modułem 2FA
    </div>
  </div>
);

const ReportsContent = () => (
  <div className="standard-view">
    <h2>Logi i Operacje</h2>
    <div className="placeholder-card">
      Historia operacji magazynowych (CSV Export)
    </div>
  </div>
);

const DashboardPage = () => {
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
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-navbar">
          <div className="path-display">root / dashboard / {activeTab}</div>
          <div className="navbar-actions">
            <div className="search-wrapper">
              <Search size={16} />
              <input type="text" placeholder="CMD+K to search..." />
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

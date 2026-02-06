import React, { useState } from "react";
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

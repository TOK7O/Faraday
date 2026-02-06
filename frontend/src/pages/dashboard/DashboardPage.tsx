import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";
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
  Menu,
  X,
  Info,
} from "lucide-react";

import "./DashboardPage.scss";
import OverviewContent from "../../components/layouts/dashboard/OverviewContent";
import InventoryContent from "../../components/layouts/dashboard/InventoryContent";
import PersonnelContent from "../../components/layouts/dashboard/PersonnelContent";
import ReportsContent from "../../components/layouts/dashboard/ReportsContent";
import { useTranslation } from "../../context/LanguageContext";

const DashboardPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");

  const NavigationContent = () => (
    <>
      <Tabs.List className="sidebar-nav">
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

        <div className="nav-group">
          <span className="group-label">
            {t.dashboardPage.sidebar.groups.securityLogs}
          </span>
          <Tabs.Trigger className="nav-item" value="personnel">
            <Users size={18} /> {t.dashboardPage.sidebar.nav.personnel}
          </Tabs.Trigger>
          <Tabs.Trigger className="nav-item" value="operations">
            <History size={18} /> {t.dashboardPage.sidebar.nav.operations}
          </Tabs.Trigger>
          <Tabs.Trigger className="nav-item" value="reports">
            <FileText size={18} /> {t.dashboardPage.sidebar.nav.reports}
          </Tabs.Trigger>
        </div>

        <div className="nav-group">
          <span className="group-label">
            {t.dashboardPage.sidebar.groups.settings}
          </span>
          <button className="nav-item">
            <Palette size={18} /> {t.dashboardPage.sidebar.nav.theme}
          </button>
          <button className="nav-item">
            <Languages size={18} /> {t.dashboardPage.sidebar.nav.language}
          </button>
        </div>
      </Tabs.List>

      <div className="sidebar-footer">
        <button className="logout-btn">
          <div className="logout-icon-wrapper">
            <LogOut size={18} />
          </div>
          <span>{t.dashboardPage.sidebar.logout}</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="dashboard-container">
      <div className="dashboard-grid-bg"></div>

      <Tabs.Root
        className="dashboard-wrapper"
        value={activeTab}
        onValueChange={setActiveTab}
        orientation="vertical"
      >
        {/* MOBILE MENU */}
        <div className="mobile-interface">
          <Dialog.Root>
            <Dialog.Trigger asChild>
              <button className="hamburger-btn">
                <Menu size={18} />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="dialog-overlay" />
              <Dialog.Content className="dialog-sidebar-content">
                <div className="sidebar-header-mobile">
                  <div className="sidebar-logo">
                    <span>
                      Faraday<span>Systems</span>
                    </span>
                  </div>
                  <Dialog.Close asChild>
                    <button className="close-btn">
                      <X size={24} />
                    </button>
                  </Dialog.Close>
                </div>
                <NavigationContent />
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>

        {/* DESKTOP SIDEBAR */}
        <aside className="dashboard-sidebar desktop-only">
          <div className="sidebar-logo">
            <span>
              Faraday<span>Systems</span>
            </span>
          </div>
          <NavigationContent />
        </aside>

        <main className="dashboard-main">
          <header className="dashboard-navbar">
            <div className="navbar-left">
              <div className="path-display">
                {t.dashboardPage.navbar.path} /{" "}
                <span className="active-path">{activeTab}</span>
              </div>
            </div>

            <div className="navbar-actions">
              <div className="search-wrapper desktop-only">
                <Search size={16} />
                <input
                  type="text"
                  placeholder={t.dashboardPage.navbar.searchPlaceholder}
                />
              </div>

              <Popover.Root>
                <Popover.Trigger asChild>
                  <button className="action-btn" aria-label="Notifications">
                    <Bell size={18} />
                    <span className="dot-alert"></span>
                  </button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content className="popover-content" sideOffset={10}>
                    <div className="popover-header">
                      <h3>Powiadomienia</h3>
                      <span className="count">2 nowe</span>
                    </div>
                    <div className="notification-list">
                      <div className="notification-item unread">
                        <Info size={16} className="notif-icon" />
                        <div className="notif-text">
                          <p>Wykryto nową operację w sektorze B-12</p>
                          <span>Przed chwilą</span>
                        </div>
                      </div>
                      <div className="notification-item">
                        <Package size={16} className="notif-icon" />
                        <div className="notif-text">
                          <p>Zaktualizowano stan inwentarza</p>
                          <span>2 godz. temu</span>
                        </div>
                      </div>
                    </div>
                    <Popover.Arrow className="popover-arrow" />
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>

              <div className="user-tag">
                <span className="role">ADM</span>
                <span className="name">Jan Nowak</span>
              </div>
            </div>
          </header>

          <section className="dashboard-content">
            <Tabs.Content value="overview">
              <OverviewContent />
            </Tabs.Content>
            <Tabs.Content value="inventory">
              <InventoryContent />
            </Tabs.Content>
            <Tabs.Content value="personnel">
              <PersonnelContent />
            </Tabs.Content>
            <Tabs.Content value="operations">
              <ReportsContent />
            </Tabs.Content>
            <Tabs.Content value="reports">
              <div className="placeholder-card">
                {t.dashboardPage.content.reports.generator}
              </div>
            </Tabs.Content>
          </section>
        </main>
      </Tabs.Root>
    </div>
  );
};

export default DashboardPage;

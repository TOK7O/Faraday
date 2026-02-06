import * as Tabs from "@radix-ui/react-tabs";
import "./Sidebar.scss";
import {
  LayoutDashboard,
  Package,
  Users,
  History,
  FileText,
  Palette,
  Languages,
  LogOut,
} from "lucide-react";
import { useTranslation } from "@/context/LanguageContext.tsx";

const Sidebar = () => {
  const { t } = useTranslation();

  return (
    <div className="sidebar-container">
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
    </div>
  );
};

export default Sidebar;

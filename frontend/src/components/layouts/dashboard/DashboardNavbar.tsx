import { useTranslation } from "@/context/LanguageContext";
import NotificationsPopover from "./NotificationsPopover";
import "./Dashboardnavbar.scss";

interface NavbarProps {
  activeTab: string;
}

const DashboardNavbar = ({ activeTab }: NavbarProps) => {
  const { t } = useTranslation();

  const username = localStorage.getItem("username") || "User";
  const userRole = localStorage.getItem("role") || "";
  const isAdmin = userRole === "Administrator";

  return (
    <header className="dashboard-navbar">
      <div className="navbar-left">
        <div className="path-display">
          {t.dashboardPage.navbar.path} /{" "}
          <span className="active-path">{activeTab}</span>
        </div>
      </div>

      <div className="navbar-actions">
        <NotificationsPopover />

        <div className="user-tag">
          {isAdmin && <span className="role">Adm</span>}
          <span className="name">{username}</span>
        </div>
      </div>
    </header>
  );
};

export default DashboardNavbar;

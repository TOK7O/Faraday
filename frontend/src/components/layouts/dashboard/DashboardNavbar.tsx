import { useTranslation } from "@/context/LanguageContext";
import NotificationsPopover from "./NotificationsPopover";
import "./Dashboardnavbar.scss";

interface NavbarProps {
    activeTab: string;
}

const DashboardNavbar = ({ activeTab }: NavbarProps) => {
    const { t } = useTranslation();

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
                    <span className="role">ADM</span>
                    <span className="name">Jan Nowak</span>
                </div>
            </div>
        </header>
    );
};

export default DashboardNavbar;
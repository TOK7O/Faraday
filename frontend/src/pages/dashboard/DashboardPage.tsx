import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import "./DashboardPage.scss";
import {Link} from "react-router-dom";

// Views
import OverviewContent from "./views/OverviewContent";
import InventoryContent from "./views/Inventory/InventoryContent";
import PersonnelContent from "./views/Personnel/PersonnelContent";
import OperationsHistory from "./views/OperationsHistory/OperationsHistory";
import ReportsContent from "./views/ReportsContent";
import BackupsContent from "./views/BackupsContent";
import PreferencesContent from "./views/Preferences/PreferencesContent";

// Components
import Sidebar from "@/components/layouts/dashboard/Sidebar";
import DashboardNavbar from "@/components/layouts/dashboard/DashboardNavbar";
import MobileNavbar from "@/components/layouts/dashboard/MobileNavbar";
import { useTranslation } from "@/context/LanguageContext";

const DashboardPage = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState("overview");

    return (
        <div className="dashboard-container">
            <div className="dashboard-grid-bg"></div>

            <Tabs.Root
                className="dashboard-wrapper"
                value={activeTab}
                onValueChange={setActiveTab}
                orientation="vertical"
            >
                <MobileNavbar />

                <aside className="dashboard-sidebar desktop-only">
                    <div className="sidebar-logo">
                        <Link to="/">
                            <span>Faraday<span>Systems</span></span>
                        </Link>
                    </div>
                    <Sidebar />
                </aside>

                <main className="dashboard-main">
                    <DashboardNavbar activeTab={activeTab} />

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
                            <OperationsHistory />
                        </Tabs.Content>
                        <Tabs.Content value="reports">
                            <ReportsContent />
                        </Tabs.Content>
                        <Tabs.Content value="backups">
                            <BackupsContent />
                        </Tabs.Content>
                        <Tabs.Content value="settings">
                            <PreferencesContent />
                        </Tabs.Content>
                    </section>
                </main>
            </Tabs.Root>
        </div>
    );
};

export default DashboardPage;
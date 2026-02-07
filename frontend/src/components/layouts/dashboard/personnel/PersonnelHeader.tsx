import { Cpu, RefreshCcw } from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";

export const PersonnelHeader = () => {
    const { t } = useTranslation();
    const persT = t.dashboardPage.content.personnel;

    return (
        <header className="content-header">
            <div className="header-brand">
                <div className="system-tag">
                    <Cpu size={14} className="icon-glow" />
                    <span>{persT.managementSystem}</span>
                </div>
                <h1>Personnel <span className="outline-text">{persT.database}</span></h1>
                <p className="lead-text">{persT.monitorDescription}</p>
            </div>
            <div className="sync-info">
                <RefreshCcw size={14} />
                <span>{persT.sync}: {new Date().toLocaleTimeString()}</span>
            </div>
        </header>
    );
};
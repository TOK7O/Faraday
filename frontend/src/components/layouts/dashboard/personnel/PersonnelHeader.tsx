import { Cpu, RefreshCcw } from "lucide-react";

export const PersonnelHeader = () => (
    <header className="content-header">
        <div className="header-brand">
            <div className="system-tag">
                <Cpu size={14} className="icon-glow" />
                <span>Personnel Management System</span>
            </div>
            <h1>Personnel <span className="outline-text">Database</span></h1>
            <p className="lead-text">Monitor operator availability and manage biometric security credentials.</p>
        </div>
        <div className="sync-info">
            <RefreshCcw size={14} />
            <span>Sync: {new Date().toLocaleTimeString()}</span>
        </div>
    </header>
);
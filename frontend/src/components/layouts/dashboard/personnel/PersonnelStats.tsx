import { User, Activity, RefreshCcw } from "lucide-react";
import type {StaffMember} from "./types";
import "./PersonnelStats.scss";
import { useTranslation } from "@/context/LanguageContext";

export const PersonnelStats = ({ staff }: { staff: StaffMember[] }) => {
    const { t } = useTranslation();
    const statsT = t.dashboardPage.content.personnel.stats;
    const stats = [
        { label: statsT.totalPersonnel, value: staff.length, icon: <User size={22} />, active: false },
        { label: statsT.activeNow, value: staff.filter(s => s.status === 'active').length, icon: <Activity size={22} />, active: true },
        { label: statsT.onBreak, value: staff.filter(s => s.status === 'break').length, icon: <RefreshCcw size={22} />, active: false }
    ];

    return (
        <div className="stats-grid">
            {stats.map((stat, i) => (
                <div className="glass-card" key={i}>
                    <div className="card-inner">
                        <div className={`icon-box ${stat.active ? 'active' : ''}`}>{stat.icon}</div>
                        <div className="data">
                            <span className="label">{stat.label}</span>
                            <span className="value">{stat.value}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
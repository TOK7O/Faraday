import { User, Activity, RefreshCcw } from "lucide-react";
import type {StaffMember} from "./types";
import "./PersonnelStats.scss";

export const PersonnelStats = ({ staff }: { staff: StaffMember[] }) => {
    const stats = [
        { label: "Total Personnel", value: staff.length, icon: <User size={22} />, active: false },
        { label: "Active Now", value: staff.filter(s => s.status === 'active').length, icon: <Activity size={22} />, active: true },
        { label: "On Break", value: staff.filter(s => s.status === 'break').length, icon: <RefreshCcw size={22} />, active: false }
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
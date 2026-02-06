import { useState, useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Select from "@radix-ui/react-select";
import {
    Plus, MoreVertical, User, Activity, ChevronDown, Check,
    X, Mail, Fingerprint, Briefcase, Search, Settings, Trash2, ShieldCheck, Cpu, RefreshCcw
} from "lucide-react";
import "./PersonnelContent.scss";

interface StaffMember {
    id: string;
    name: string;
    email: string;
    role: string;
    status: "active" | "break" | "offline";
}

const INITIAL_STAFF: StaffMember[] = [
    { id: "STAFF-01", name: "Jan Kowalski", email: "j.kowalski@faraday.systems", role: "Warehouse Manager", status: "active" },
    { id: "STAFF-02", name: "Anna Nowak", email: "a.nowak@faraday.systems", role: "Forklift Operator", status: "break" },
    { id: "STAFF-03", name: "Marek Zima", email: "m.zima@faraday.systems", role: "Logistics Specialist", status: "offline" },
    { id: "STAFF-04", name: "Ewa Bema", email: "e.bema@faraday.systems", role: "Security Chief", status: "active" },
];

const PersonnelContent = () => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [staff] = useState<StaffMember[]>(INITIAL_STAFF);

    const filteredStaff = useMemo(() => {
        return staff.filter(person =>
            person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            person.id.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, staff]);

    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

    return (
        <div className="personnel-view-container">
            <header className="content-header">
                <div className="header-brand">
                    <div className="system-tag">
                        <Cpu size={14} className="icon-glow" />
                        <span>Personnel Management System</span>
                    </div>
                    <h1>Personnel <span className="outline-text">Database</span></h1>
                    <p className="lead-text">Monitor operator availability and manage biometric security credentials across the cluster.</p>
                </div>
                <div className="sync-info">
                    <RefreshCcw size={14} />
                    <span>Last Sync: {new Date().toLocaleTimeString()}</span>
                </div>
            </header>

            <div className="stats-grid">
                {[
                    { label: "Total Personnel", value: staff.length, icon: <User size={22} />, active: false },
                    { label: "Active Now", value: staff.filter(s => s.status === 'active').length, icon: <Activity size={22} />, active: true },
                    { label: "On Break", value: staff.filter(s => s.status === 'break').length, icon: <RefreshCcw size={22} />, active: false }
                ].map((stat, i) => (
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

            <div className="action-bar">
                <div className="search-container">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Filter by ID or Name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <Dialog.Root open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <Dialog.Trigger asChild>
                        <button className="btn-primary-ht">
                            <Plus size={18} />
                            <span>Register Operator</span>
                        </button>
                    </Dialog.Trigger>

                    <Dialog.Portal>
                        <Dialog.Overlay className="dialog-overlay-ht" />
                        <Dialog.Content className="dialog-content-ht">
                            <div className="modal-accent-line" />
                            <div className="modal-header">
                                <Dialog.Title>Operator Authorization</Dialog.Title>
                                <Dialog.Close asChild>
                                    <button className="btn-close"><X size={20} /></button>
                                </Dialog.Close>
                            </div>

                            <form className="ht-form" onSubmit={(e) => e.preventDefault()}>
                                <div className="input-group">
                                    <label><User size={14} /> Full Name</label>
                                    <input type="text" placeholder="e.g. Erik Magnusson" />
                                </div>
                                <div className="input-group">
                                    <label><Mail size={14} /> System Email</label>
                                    <input type="email" placeholder="e.magnusson@faraday.systems" />
                                </div>

                                <div className="input-row">
                                    <div className="input-group">
                                        <label><Briefcase size={14} /> Sector Role</label>
                                        <Select.Root defaultValue="operator">
                                            <Select.Trigger className="ht-select-trigger">
                                                <Select.Value />
                                                <Select.Icon className="select-chevron"><ChevronDown size={14} /></Select.Icon>
                                            </Select.Trigger>
                                            <Select.Portal>
                                                <Select.Content className="ht-select-content" position="popper" sideOffset={5}>
                                                    <Select.Viewport className="ht-select-viewport">
                                                        <Select.Item className="ht-select-item" value="operator">
                                                            <Select.ItemText>Operator</Select.ItemText>
                                                            <Select.ItemIndicator><Check size={14}/></Select.ItemIndicator>
                                                        </Select.Item>
                                                        <Select.Item className="ht-select-item" value="manager">
                                                            <Select.ItemText>Fleet Manager</Select.ItemText>
                                                            <Select.ItemIndicator><Check size={14}/></Select.ItemIndicator>
                                                        </Select.Item>
                                                    </Select.Viewport>
                                                </Select.Content>
                                            </Select.Portal>
                                        </Select.Root>
                                    </div>
                                    <div className="input-group">
                                        <label><Fingerprint size={14} /> Security ID</label>
                                        <input type="text" placeholder="FS-XXXX" />
                                    </div>
                                </div>
                                <button type="submit" className="btn-submit-ht">Confirm & Authorize</button>
                            </form>
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog.Root>
            </div>

            <div className="glass-table-wrapper">
                <table className="ht-table">
                    <thead>
                    <tr>
                        <th>Employee ID</th>
                        <th>Identity</th>
                        <th>Assigned Role</th>
                        <th>Status</th>
                        <th className="text-right">Management</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredStaff.map((person) => (
                        <tr key={person.id}>
                            <td className="id-col">{person.id}</td>
                            <td className="name-col">
                                <div className="user-info-cell">
                                    <div className="avatar-mini">{getInitials(person.name)}</div>
                                    <div className="details">
                                        <span className="full-name">{person.name}</span>
                                        <span className="sub-email">{person.email}</span>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div className="role-badge">
                                    <ShieldCheck size={12} />
                                    {person.role}
                                </div>
                            </td>
                            <td>
                                <div className={`status-pill-ht ${person.status}`}>
                                    <span className="glow-dot"></span>
                                    {person.status}
                                </div>
                            </td>
                            <td className="text-right">
                                <DropdownMenu.Root>
                                    <DropdownMenu.Trigger asChild>
                                        <button className="btn-action-ht"><MoreVertical size={18} /></button>
                                    </DropdownMenu.Trigger>
                                    <DropdownMenu.Portal>
                                        <DropdownMenu.Content className="dropdown-ht" align="end" sideOffset={10}>
                                            <DropdownMenu.Item className="dd-item">
                                                <Settings size={14} /> Configure Access
                                            </DropdownMenu.Item>
                                            <DropdownMenu.Separator className="dd-divider" />
                                            <DropdownMenu.Item className="dd-item danger">
                                                <Trash2 size={14} /> Revoke Permissions
                                            </DropdownMenu.Item>
                                        </DropdownMenu.Content>
                                    </DropdownMenu.Portal>
                                </DropdownMenu.Root>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                {filteredStaff.length === 0 && (
                    <div className="empty-state">No operators matching current filters.</div>
                )}
            </div>
        </div>
    );
};

export default PersonnelContent;
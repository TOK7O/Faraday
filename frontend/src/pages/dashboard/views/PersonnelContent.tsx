import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Select from "@radix-ui/react-select";
import {
    Plus, MoreVertical, User, Activity, ChevronDown, Check,
    X, Mail, Fingerprint, Briefcase, Search, Settings, Trash2, ShieldCheck, Cpu
} from "lucide-react";
import "./PersonnelContent.scss";

interface StaffMember {
    id: string;
    name: string;
    email: string;
    role: string;
    status: "active" | "break" | "offline";
    lastActive: string;
}

const PersonnelContent = () => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const [staff] = useState<StaffMember[]>([
        { id: "STAFF-01", name: "Jan KOWALSKI", email: "e.JanKOWALSKI@faraday.systems", role: "Warehouse Manager", status: "active", lastActive: "Now" },
        { id: "STAFF-02", name: "Jan KOWALSKI", email: "k.JanKOWALSKI@faraday.systems", role: "Forklift Operator", status: "break", lastActive: "15m ago" },
        { id: "STAFF-03", name: "Jan KOWALSKI", email: "m.JanKOWALSKI@faraday.systems", role: "Logistics Specialist", status: "offline", lastActive: "2h ago" },
    ]);

    return (
        <div className="personnel-view-container">
            <header className="content-header">
                <div className="header-brand">
                    <div className="system-tag">
                        <Cpu size={14} className="icon-glow" />
                        <span>Personnel Management System</span>
                    </div>
                    <h1>Personnel <span className="outline-text">Database</span></h1>
                    <p className="lead-text">Manage operators, permissions, and biometric access to the warehouse cluster.</p>
                </div>
            </header>

            <div className="stats-grid">
                <div className="glass-card">
                    <div className="card-inner">
                        <div className="icon-box"><User size={24} /></div>
                        <div className="data">
                            <span className="label">Total Personnel</span>
                            <span className="value">{staff.length}</span>
                        </div>
                    </div>
                </div>
                <div className="glass-card">
                    <div className="card-inner">
                        <div className="icon-box active"><Activity size={24} /></div>
                        <div className="data">
                            <span className="label">Current Operators</span>
                            <span className="value">{staff.filter(s => s.status === 'active').length}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="action-bar">
                <div className="search-container">
                    <Search size={18} className="search-icon" />
                    <input type="text" placeholder="Search personnel database..." />
                </div>

                <Dialog.Root open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <Dialog.Trigger asChild>
                        <button className="btn-primary-ht">
                            <Plus size={18} />
                            <span>Register New Operator</span>
                        </button>
                    </Dialog.Trigger>
                    <Dialog.Portal>
                        <Dialog.Overlay className="dialog-overlay-ht" />
                        <Dialog.Content className="dialog-content-ht">
                            <div className="modal-accent-line" />
                            <div className="modal-header">
                                <Dialog.Title asChild>
                                    <h2>Operator Authorization</h2>
                                </Dialog.Title>
                                <Dialog.Close asChild>
                                    <button className="btn-close"><X size={24} /></button>
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
                                                <Select.Icon className="select-chevron">
                                                    <ChevronDown size={16} />
                                                </Select.Icon>
                                            </Select.Trigger>

                                            <Select.Portal>
                                                <Select.Content
                                                    className="ht-select-content"
                                                    position="popper"
                                                    sideOffset={5}
                                                >
                                                    <Select.Viewport className="ht-select-viewport">
                                                        <Select.Item className="ht-select-item" value="operator">
                                                            <Select.ItemText>Warehouse Operator</Select.ItemText>
                                                            <Select.ItemIndicator>
                                                                <Check size={14}/>
                                                            </Select.ItemIndicator>
                                                        </Select.Item>

                                                        <Select.Item className="ht-select-item" value="manager">
                                                            <Select.ItemText>Fleet Manager</Select.ItemText>
                                                            <Select.ItemIndicator>
                                                                <Check size={14}/>
                                                            </Select.ItemIndicator>
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
                                <button type="submit" className="btn-submit-ht">Confirm & Generate Access</button>
                            </form>
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog.Root>
            </div>

            <div className="glass-table-wrapper">
                <table className="ht-table">
                    <thead>
                    <tr>
                        <th>ID</th>
                        <th>Employee</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th className="text-right">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {staff.map((person) => (
                        <tr key={person.id}>
                            <td className="id-col">{person.id}</td>
                            <td className="name-col">{person.name}</td>
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
                                        <button className="btn-action-ht"><MoreVertical size={20} /></button>
                                    </DropdownMenu.Trigger>
                                    <DropdownMenu.Content className="dropdown-ht" align="end" sideOffset={10}>
                                        <DropdownMenu.Item className="dd-item"><Settings size={14} /> Configure</DropdownMenu.Item>
                                        <DropdownMenu.Item className="dd-item danger"><Trash2 size={14} /> Terminate</DropdownMenu.Item>
                                    </DropdownMenu.Content>
                                </DropdownMenu.Root>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PersonnelContent;
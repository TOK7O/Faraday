import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ShieldCheck, MoreVertical, Settings, Trash2 } from "lucide-react";
import type {StaffMember} from "./types";
import "./StaffTable.scss";
import { useTranslation } from "@/context/LanguageContext";

export const StaffTable = ({ staff }: { staff: StaffMember[] }) => {
    const { t } = useTranslation();
    const tableT = t.dashboardPage.content.personnel.table;
    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

    return (
        <div className="glass-table-wrapper">
            <table className="ht-table">
                <thead>
                <tr>
                    <th>{tableT.employeeId}</th>
                    <th>{tableT.identity}</th>
                    <th>{tableT.assignedRole}</th>
                    <th>{tableT.status}</th>
                    <th className="text-right">{tableT.management}</th>
                </tr>
                </thead>
                <tbody>
                {staff.map((person) => (
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
                        <td><div className="role-badge"><ShieldCheck size={12} /> {person.role}</div></td>
                        <td><div className={`status-pill-ht ${person.status}`}><span className="glow-dot"></span>{person.status}</div></td>
                        <td className="text-right">
                            <DropdownMenu.Root>
                                <DropdownMenu.Trigger asChild><button className="btn-action-ht"><MoreVertical size={18} /></button></DropdownMenu.Trigger>
                                <DropdownMenu.Portal>
                                    <DropdownMenu.Content className="dropdown-ht" align="end" sideOffset={10}>
                                        <DropdownMenu.Item className="dd-item"><Settings size={14} /> {tableT.configureAccess}</DropdownMenu.Item>
                                        <DropdownMenu.Separator className="dd-divider" />
                                        <DropdownMenu.Item className="dd-item danger"><Trash2 size={14} /> {tableT.revokePermissions}</DropdownMenu.Item>
                                    </DropdownMenu.Content>
                                </DropdownMenu.Portal>
                            </DropdownMenu.Root>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};
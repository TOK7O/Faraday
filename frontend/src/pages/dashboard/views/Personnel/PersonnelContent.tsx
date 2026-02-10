import { useState, useEffect, useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
    Users, Plus, Search, MoreVertical, Ban, CheckCircle,
    Shield, User, Loader2, X, UserPlus, Mail
} from "lucide-react";
import { getAllUsers, registerUser, updateUser } from "@/api/axios";
import "./PersonnelContent.scss";
import "@/styles/_components-ui.scss";

// --- 1. DEFINICJE TYPÓW DANYCH ---

const UserRole = {
    Administrator: 0,
    WarehouseWorker: 1
} as const;

type UserRole = typeof UserRole[keyof typeof UserRole];

// Format danych z API
interface UserListDto {
    id: number;
    username: string;
    email: string;
    role: string;
    isActive: boolean;
    isTwoFactorEnabled: boolean;
    lastLoginDate?: string;
    createdAt: string;
}

// Format danych dla widoku (Tabeli)
interface StaffMember {
    id: string;        // Wyświetlane ID (np. USR-001)
    realId: number;    // ID do API
    name: string;
    email: string;
    role: string;
    status: "active" | "offline";
    lastLogin?: string;
}

// --- 2. GŁÓWNY KOMPONENT ---

const PersonnelContent = () => {
    // --- STAN APLIKACJI ---
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Stan Modala Dodawania
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [newUserForm, setNewUserForm] = useState<{
        username: string;
        email: string;
        password: string;
        role: UserRole;
    }>({
        username: "",
        email: "",
        password: "",
        role: UserRole.WarehouseWorker
    });

    // Sprawdzenie uprawnień (z LocalStorage)
    const isAdmin = localStorage.getItem("role") === "Administrator";

    // --- FUNKCJE API ---

    // Pobieranie listy pracowników
    const fetchStaff = async () => {
        setIsLoading(true);
        try {
            const usersData: UserListDto[] = await getAllUsers();

            // Mapowanie danych z API na format tabeli
            const mappedStaff: StaffMember[] = usersData.map(user => ({
                id: `USR-${user.id.toString().padStart(3, '0')}`,
                realId: user.id,
                name: user.username,
                email: user.email,
                role: user.role,
                status: user.isActive ? "active" : "offline",
                lastLogin: user.lastLoginDate
            }));

            setStaff(mappedStaff);
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Zmiana statusu (Aktywacja / Dezaktywacja)
    const handleToggleStatus = async (userId: number, isCurrentlyActive: boolean) => {
        const action = isCurrentlyActive ? "deactivate" : "activate";
        if (!confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            await updateUser(userId, { isActive: !isCurrentlyActive });
            await fetchStaff(); // Odśwież listę po zmianie
        } catch (error) {
            alert("Failed to update status.");
            console.error(error);
        }
    };

    // Dodawanie nowego użytkownika
    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setModalError(null);

        try {
            await registerUser(newUserForm);
            setIsModalOpen(false); // Zamknij modal
            setNewUserForm({ username: "", email: "", password: "", role: UserRole.WarehouseWorker }); // Reset
            await fetchStaff(); // Odśwież listę
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || "Failed to create user.";
            setModalError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Pobierz dane przy starcie
    useEffect(() => {
        fetchStaff();
    }, []);

    // --- POMOCNICZE ---

    // Filtrowanie listy
    const filteredStaff = useMemo(() => {
        const lowerQuery = searchQuery.toLowerCase();
        return staff.filter(person =>
            person.name.toLowerCase().includes(lowerQuery) ||
            person.email.toLowerCase().includes(lowerQuery) ||
            person.role.toLowerCase().includes(lowerQuery)
        );
    }, [searchQuery, staff]);

    // Stylizacja badge'y ról
    const getRoleBadgeStyle = (role: string) => {
        if (role === 'Administrator') {
            return {
                background: 'rgba(124, 58, 237, 0.15)',
                color: '#a78bfa',
                border: '1px solid rgba(124, 58, 237, 0.3)'
            };
        }
        return {
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            border: '1px solid rgba(59, 130, 246, 0.3)'
        };
    };

    // --- RENDEROWANIE WIDOKU ---

    return (
        <div className="personnel-view-container">
            {/* 1. HEADER SEKCJI */}
            <header className="content-header">
                <div className="header-brand">
                    <div className="system-tag">
                        <Users size={14} className="icon-glow" />
                        <span>System Administration</span>
                    </div>
                    <h1>Personnel Management</h1>
                    <p className="lead-text">Manage system access, user roles, and account statuses.</p>
                </div>
            </header>

            {/* 2. PASEK AKCJI (Szukanie + Dodawanie) */}
            <div className="action-bar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="search-wrapper" style={{ position: 'relative', flex: 1, minWidth: '280px', maxWidth: '500px' }}>
                    <Search className="search-icon" size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search personnel by name, email or role..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="ht-input"
                        style={{ paddingLeft: '40px', width: '100%', height: '3.2rem' }}
                    />
                </div>

                {/* Przycisk widoczny TYLKO dla Administratora */}
                {isAdmin && (
                    <button className="btn-submit-ht" style={{ width: 'auto', padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => setIsModalOpen(true)}>
                        <Plus size={20} />
                        <span>Add User</span>
                    </button>
                )}
            </div>

            {/* 3. TABELA PRACOWNIKÓW */}
            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--accent-primary)' }}>
                    <Loader2 className="animate-spin" size={32} />
                </div>
            ) : (
                <div className="table-container">
                    <table className="ht-table">
                        <thead>
                        <tr>
                            <th>ID</th>
                            <th>User</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Last Login</th>
                            {isAdmin && <th className="text-right">Action</th>}
                        </tr>
                        </thead>
                        <tbody>
                        {filteredStaff.length > 0 ? (
                            filteredStaff.map((person) => (
                                <tr key={person.realId} style={{ opacity: person.status === 'active' ? 1 : 0.5 }}>
                                    <td className="id-col" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                        {person.id}
                                    </td>
                                    <td className="name-col">
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{person.name}</span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Mail size={10} /> {person.email}
                                                </span>
                                        </div>
                                    </td>
                                    <td>
                                            <span
                                                className="role-badge"
                                                style={{
                                                    ...getRoleBadgeStyle(person.role),
                                                    padding: '4px 10px',
                                                    borderRadius: '20px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6
                                                }}
                                            >
                                                {person.role === 'Administrator' ? <Shield size={12} /> : <User size={12} />}
                                                {person.role}
                                            </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span className={`status-dot ${person.status}`}></span>
                                            <span style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700 }}>
                                                    {person.status}
                                                </span>
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        {person.lastLogin ? new Date(person.lastLogin).toLocaleString() : "Never"}
                                    </td>

                                    {/* Akcje dostępne TYLKO dla Administratora */}
                                    {isAdmin && (
                                        <td className="text-right">
                                            <DropdownMenu.Root>
                                                <DropdownMenu.Trigger asChild>
                                                    <button className="btn-icon" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                                        <MoreVertical size={18} />
                                                    </button>
                                                </DropdownMenu.Trigger>

                                                <DropdownMenu.Portal>
                                                    <DropdownMenu.Content className="dropdown-ht" sideOffset={5} align="end">
                                                        <DropdownMenu.Item
                                                            className="dd-item danger"
                                                            onClick={() => handleToggleStatus(person.realId, person.status === 'active')}
                                                        >
                                                            {person.status === 'active' ? (
                                                                <><Ban size={16} /> Deactivate Account</>
                                                            ) : (
                                                                <><CheckCircle size={16} /> Activate Account</>
                                                            )}
                                                        </DropdownMenu.Item>
                                                    </DropdownMenu.Content>
                                                </DropdownMenu.Portal>
                                            </DropdownMenu.Root>
                                        </td>
                                    )}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                    No users found matching your search.
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 4. MODAL DODAWANIA UŻYTKOWNIKA */}
            <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="dialog-overlay-ht" />
                    <Dialog.Content className="dialog-content-ht">
                        <div className="modal-header">
                            <h2><UserPlus size={28} style={{ marginRight: 10, marginBottom: -4 }} /> New User</h2>
                            <button className="btn-close" onClick={() => setIsModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="ht-form">
                            <div className="input-group">
                                <label>Username</label>
                                <input
                                    required
                                    value={newUserForm.username}
                                    onChange={e => setNewUserForm({ ...newUserForm, username: e.target.value })}
                                    placeholder="e.g. j.doe"
                                />
                            </div>
                            <div className="input-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    required
                                    value={newUserForm.email}
                                    onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                                    placeholder="user@faraday.systems"
                                />
                            </div>
                            <div className="input-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={newUserForm.password}
                                    onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                                    placeholder="Minimum 6 characters"
                                />
                            </div>
                            <div className="input-group">
                                <label>Role</label>
                                <select
                                    className="ht-input"
                                    style={{
                                        padding: '0 1rem',
                                        height: '2.8rem',
                                        borderRadius: '10px',
                                        background: 'var(--bg-input)',
                                        border: '1px solid var(--border-input)',
                                        color: 'var(--text-main)',
                                        width: '100%'
                                    }}
                                    value={newUserForm.role}
                                    onChange={e =>
                                        setNewUserForm({
                                            ...newUserForm,
                                            role: Number(e.target.value) as UserRole
                                        })
                                    }                                >
                                    <option value={UserRole.WarehouseWorker}>Warehouse Worker</option>
                                    <option value={UserRole.Administrator}>Administrator</option>
                                </select>
                            </div>

                            {modalError && (
                                <div style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', fontSize: '0.9rem' }}>
                                    {modalError}
                                </div>
                            )}

                            <button type="submit" className="btn-submit-ht" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin" /> : "CREATE ACCOUNT"}
                            </button>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
};

export default PersonnelContent;
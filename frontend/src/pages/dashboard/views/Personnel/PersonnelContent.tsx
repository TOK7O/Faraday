import { useState, useEffect, useMemo } from "react";
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Ban,
  CheckCircle,
  Shield,
  User,
  Loader2,
  Mail,
  Key,
  Smartphone,
  Edit,
  X,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import * as Form from "@radix-ui/react-form";

import {
  getAllUsers,
  updateUser,
  resetUserPassword,
  resetUser2FA,
  deleteUser,
} from "@/api/axios";

import { AddUserModal } from "@/components/layouts/dashboard/personnel/AddUserModal";
import { RegisterPasswordFieldPair } from "@/components/ui/RegisterPasswordFieldPair";
import { useTranslation } from "@/context/LanguageContext";

import "./PersonnelContent.scss";
import "@/styles/_components-ui.scss";

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

interface StaffMember {
  id: string;
  realId: number;
  name: string;
  email: string;
  role: string;
  status: "active" | "offline";
  lastLogin?: string;
  is2faEnabled: boolean;
}

const UserRole = {
  Administrator: 0,
  WarehouseWorker: 1,
} as const;
type UserRole = (typeof UserRole)[keyof typeof UserRole];

const { t } = useTranslation();
const tPers = t.dashboardPage.content.personnel;
const tModals = t.dashboardPage.content.personnel.modals;

const fieldsData = useMemo(
  () => ({
    password: {
      label: tModals.resetPassword.newPassword,
      placeholder: tModals.resetPassword.placeholders.newPassword,
      validation: {
        required: tModals.resetPassword.errors.required,
        tooShort: tModals.resetPassword.errors.tooShort,
        noNumber: tModals.resetPassword.errors.noNumber,
        noSpecialChar: tModals.resetPassword.errors.noSpecial,
      },
    },
    confirmPassword: {
      label: tModals.resetPassword.confirmPassword,
      placeholder: tModals.resetPassword.placeholders.confirm,
      validation: {
        required: tModals.resetPassword.errors.confirmRequired,
        mismatch: tModals.resetPassword.errors.mismatch,
      },
    },
  }),
  [tModals],
);

const PersonnelContent = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isResetPassOpen, setIsResetPassOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<StaffMember | null>(null);
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [editFormData, setEditFormData] = useState({
    email: "",
    role: UserRole.WarehouseWorker as UserRole,
  });

  const isAdmin = localStorage.getItem("role") === "Administrator";

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const usersData: UserListDto[] = await getAllUsers();
      const mappedStaff: StaffMember[] = usersData.map((user) => ({
        id: `USR-${user.id.toString().padStart(3, "0")}`,
        realId: user.id,
        name: user.username,
        email: user.email,
        role: user.role,
        status: user.isActive ? "active" : "offline",
        lastLogin: user.lastLoginDate,
        is2faEnabled: user.isTwoFactorEnabled,
      }));
      setStaff(mappedStaff);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleToggleStatus = async (
    userId: number,
    isCurrentlyActive: boolean,
  ) => {
    const actionMsg = isCurrentlyActive
      ? tPers.messages.confirmDeactivate
      : tPers.messages.confirmActivate;
    if (!confirm(actionMsg)) return;
    try {
      await updateUser(userId, { isActive: !isCurrentlyActive });
      await fetchStaff();
    } catch (error) {
      alert(tPers.messages.updateError);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm(tPers.messages.confirmDelete)) return;
    try {
      await deleteUser(userId);
      await fetchStaff();
    } catch (error: any) {
      alert(
        error?.response?.data?.message || tPers.messages.error,
      );
    }
  };

  const handleReset2FA = async (userId: number) => {
    if (!confirm(tPers.messages.confirmReset2fa)) return;
    try {
      await resetUser2FA(userId);
      alert(tPers.messages.reset2faSuccess);
      await fetchStaff();
    } catch (error) {
      alert(tPers.messages.error);
    }
  };

  const openEditModal = (user: StaffMember) => {
    setSelectedUser(user);
    setEditFormData({
      email: user.email,
      role:
        user.role === "Administrator"
          ? UserRole.Administrator
          : UserRole.WarehouseWorker,
    });
    setIsEditUserOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await updateUser(selectedUser.realId, {
        email: editFormData.email,
        role: editFormData.role,
        isActive: selectedUser.status === "active",
      });
      setIsEditUserOpen(false);
      await fetchStaff();
    } catch (error) {
      alert(tPers.messages.updateError);
    }
  };

  const openResetPassModal = (user: StaffMember) => {
    setSelectedUser(user);
    setNewAdminPassword("");
    setIsResetPassOpen(true);
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser || !newAdminPassword) return;

    const formData = new FormData(e.currentTarget);
    const passwordToSet = formData.get("password") as string;

    try {
      await resetUserPassword(selectedUser.realId, passwordToSet);
      alert(tPers.messages.resetPassSuccess);
      setIsResetPassOpen(false);
    } catch (error) {
      alert(tPers.messages.resetPassError);
    }
  };

  const filteredStaff = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    return staff.filter(
      (person) =>
        person.name.toLowerCase().includes(lowerQuery) ||
        person.email.toLowerCase().includes(lowerQuery) ||
        person.role.toLowerCase().includes(lowerQuery),
    );
  }, [searchQuery, staff]);

  const getRoleBadgeStyle = (role: string) => {
    if (role === "Administrator")
      return {
        background: "rgba(124, 58, 237, 0.15)",
        color: "#a78bfa",
        border: "1px solid rgba(124, 58, 237, 0.3)",
      };
    return {
      background: "rgba(59, 130, 246, 0.15)",
      color: "#60a5fa",
      border: "1px solid rgba(59, 130, 246, 0.3)",
    };
  };

  return (
    <div className="personnel-view-container">
      <header className="content-header">
        <div className="header-brand">
          <div className="system-tag">
            <Users size={14} className="icon-glow" />
            <span>{tPers.tag}</span>
          </div>
          <h1>{tPers.title}</h1>
          <p className="lead-text">
            {tPers.description}
          </p>
        </div>
      </header>

      <div
        className="action-bar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div
          className="search-wrapper"
          style={{
            position: "relative",
            flex: 1,
            minWidth: "280px",
            maxWidth: "500px",
          }}
        >
          <Search
            className="search-icon"
            size={18}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            type="text"
            placeholder={tPers.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ht-input"
            style={{ paddingLeft: "40px", width: "100%", height: "3.2rem" }}
          />
        </div>
        {isAdmin && (
          <button
            className="btn-submit-ht"
            style={{
              width: "auto",
              padding: "0 1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
            onClick={() => setIsAddUserOpen(true)}
          >
            <Plus size={20} />
            <span>{tPers.addUser}</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "4rem",
            color: "var(--accent-primary)",
          }}
        >
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : (
        <div className="table-container">
          <table className="ht-table">
            <thead>
              <tr>
                <th>{tPers.table.id}</th>
                <th>{tPers.table.user}</th>
                <th>{tPers.table.role}</th>
                <th>{tPers.table.status}</th>
                <th>{tPers.table.security}</th>
                <th>{tPers.table.lastLogin}</th>
                {isAdmin && <th className="text-right">{tPers.table.action}</th>}
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((person) => (
                <tr
                  key={person.realId}
                  style={{ opacity: person.status === "active" ? 1 : 0.5 }}
                >
                  <td className="id-col" style={{ fontFamily: "monospace" }}>
                    {person.id}
                  </td>
                  <td className="name-col">
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span
                        style={{ fontWeight: 600, color: "var(--text-main)" }}
                      >
                        {person.name}
                      </span>
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        <Mail size={10} /> {person.email}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span
                      className="role-badge"
                      style={{
                        ...getRoleBadgeStyle(person.role),
                        padding: "4px 10px",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {person.role === "Administrator" ? (
                        <Shield size={12} />
                      ) : (
                        <User size={12} />
                      )}
                      {person.role === "Administrator" ? tPers.roles.admin : tPers.roles.worker}
                    </span>
                  </td>
                  <td>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span className={`status-dot ${person.status}`}></span>
                      <span
                        style={{
                          textTransform: "uppercase",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        {person.status === "active" ? tPers.status.active : tPers.status.offline}
                      </span>
                    </div>
                  </td>
                  <td>
                    {person.is2faEnabled && (
                      <span style={{ color: "#4ade80", fontSize: "0.75rem" }}>
                        <Smartphone size={12} /> {tPers.status.twoFactorOn}
                      </span>
                    )}
                  </td>
                  <td
                    style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}
                  >
                    {person.lastLogin
                      ? new Date(person.lastLogin).toLocaleString()
                      : tPers.status.never}
                  </td>
                  {isAdmin && (
                    <td className="text-right">
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button className="btn-icon">
                            <MoreVertical size={18} />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            className="dropdown-ht"
                            align="end"
                          >
                            <DropdownMenu.Item
                              className="dd-item"
                              onClick={() => openEditModal(person)}
                            >
                              <Edit size={16} /> {tPers.actions.edit}
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                              className="dd-item"
                              onClick={() => openResetPassModal(person)}
                            >
                              <Key size={16} /> {tPers.actions.resetPass}
                            </DropdownMenu.Item>
                            {person.is2faEnabled && (
                              <DropdownMenu.Item
                                className="dd-item danger"
                                onClick={() => handleReset2FA(person.realId)}
                              >
                                <Smartphone size={16} /> {tPers.actions.reset2fa}
                              </DropdownMenu.Item>
                            )}
                            <div className="dd-divider" />
                            <DropdownMenu.Item
                              className="dd-item danger"
                              onClick={() =>
                                handleToggleStatus(
                                  person.realId,
                                  person.status === "active",
                                )
                              }
                            >
                              {person.status === "active" ? (
                                <>
                                  <Ban size={16} /> {tPers.actions.deactivate}
                                </>
                              ) : (
                                <>
                                  <CheckCircle size={16} /> {tPers.actions.activate}
                                </>
                              )}
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                              className="dd-item danger"
                              onClick={() => handleDeleteUser(person.realId)}
                            >
                              <X size={16} /> {tPers.actions.delete}
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddUserModal
        open={isAddUserOpen}
        onOpenChange={setIsAddUserOpen}
        onSuccess={fetchStaff}
      />

      <Dialog.Root open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay-ht" />
          <Dialog.Content className="dialog-content-ht">
            <div className="modal-header">
              <h2>
                <Edit size={24} className="icon-accent" /> {tModals.editUser.title}
              </h2>
              <button
                className="btn-close"
                onClick={() => setIsEditUserOpen(false)}
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="ht-form">
              <div className="input-group">
                <label>{tModals.editUser.username}</label>
                <input
                  className="ht-input"
                  disabled
                  value={selectedUser?.name || ""}
                  style={{ opacity: 0.5 }}
                />
              </div>
              <div className="input-group">
                <label>{tModals.editUser.email}</label>
                <input
                  className="ht-input"
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, email: e.target.value })
                  }
                />
              </div>
              <div className="input-group">
                <label>{tModals.editUser.role}</label>
                <select
                  className="ht-input"
                  value={editFormData.role}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      role: Number(e.target.value) as UserRole,
                    })
                  }
                >
                  <option value={UserRole.WarehouseWorker}>
                    {tPers.roles.worker}
                  </option>
                  <option value={UserRole.Administrator}>{tPers.roles.admin}</option>
                </select>
              </div>
              <button type="submit" className="btn-submit-ht">
                {tModals.editUser.save}
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={isResetPassOpen} onOpenChange={setIsResetPassOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay-ht" />
          <Dialog.Content className="dialog-content-ht">
            <div className="modal-header">
              <h2>
                <Key size={24} className="icon-accent" /> {tModals.resetPassword.title}
              </h2>
              <button
                className="btn-close"
                onClick={() => setIsResetPassOpen(false)}
              >
                <X size={24} />
              </button>
            </div>
            <Form.Root className="ht-form" onSubmit={handleResetPassword}>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                {tModals.resetPassword.description} <strong>{selectedUser?.name}</strong>.
              </p>

              <RegisterPasswordFieldPair
                passwordData={fieldsData.password}
                confirmData={fieldsData.confirmPassword}
                onChange={(pass) => setNewAdminPassword(pass)}
              />

              <Form.Submit asChild>
                <button
                  type="submit"
                  className="btn-submit-ht"
                  disabled={!newAdminPassword}
                >
                  {tModals.resetPassword.submit}
                </button>
              </Form.Submit>
            </Form.Root>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default PersonnelContent;

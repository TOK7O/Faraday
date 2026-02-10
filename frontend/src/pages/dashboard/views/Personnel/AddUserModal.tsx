import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Loader2, UserPlus } from "lucide-react";
import { registerUser } from "@/api/axios";
import "./AddUserModal.scss";

// Definicja stałych i typów
const UserRole = {
    Administrator: 0,
    WarehouseWorker: 1
} as const;

type UserRole = typeof UserRole[keyof typeof UserRole];

interface FormData {
    username: string;
    email: string;
    password: string;
    role: UserRole;
}

interface AddUserModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export const AddUserModal = ({ open, onOpenChange, onSuccess }: AddUserModalProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Inicjalizacja stanu z rzutowaniem typu dla Role
    const [formData, setFormData] = useState<FormData>({
        username: "",
        email: "",
        password: "",
        role: UserRole.WarehouseWorker
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            await registerUser(formData);
            onSuccess();
            onOpenChange(false);
            // Reset formularza
            setFormData({
                username: "",
                email: "",
                password: "",
                role: UserRole.WarehouseWorker
            });
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || "Failed to create user.";
            setError(typeof msg === "string" ? msg : JSON.stringify(msg));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                {/* Tło (Overlay) */}
                <Dialog.Overlay className="dialog-overlay-ht" />

                {/* Treść Modala */}
                <Dialog.Content className="dialog-content-ht">
                    <div className="modal-header">
                        <h2>
                            <UserPlus size={24} className="icon-accent" />
                            New User
                        </h2>
                        <button className="btn-close" onClick={() => onOpenChange(false)}>
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="ht-form">
                        <div className="input-group">
                            <label>Username</label>
                            <input
                                className="ht-input"
                                required
                                placeholder="e.g. j.doe"
                                value={formData.username}
                                onChange={e =>
                                    setFormData({ ...formData, username: e.target.value })
                                }
                            />
                        </div>

                        <div className="input-group">
                            <label>Email</label>
                            <input
                                className="ht-input"
                                type="email"
                                required
                                placeholder="user@faraday.systems"
                                value={formData.email}
                                onChange={e =>
                                    setFormData({ ...formData, email: e.target.value })
                                }
                            />
                        </div>

                        <div className="input-group">
                            <label>Password</label>
                            <input
                                className="ht-input"
                                type="password"
                                required
                                minLength={6}
                                placeholder="Min. 6 characters"
                                value={formData.password}
                                onChange={e =>
                                    setFormData({ ...formData, password: e.target.value })
                                }
                            />
                        </div>

                        <div className="input-group">
                            <label>Role</label>
                            <select
                                className="ht-input"
                                value={formData.role}
                                onChange={e =>
                                    setFormData({
                                        ...formData,
                                        role: Number(e.target.value) as UserRole
                                    })
                                }
                            >
                                <option value={UserRole.WarehouseWorker}>Warehouse Worker</option>
                                <option value={UserRole.Administrator}>Administrator</option>
                            </select>
                        </div>

                        {error && (
                            <div className="error-banner">
                                {error}
                            </div>
                        )}

                        <button type="submit" className="btn-submit-ht" disabled={isLoading}>
                            {isLoading ? (
                                <><Loader2 className="animate-spin" size={20} /> Creating...</>
                            ) : (
                                "CREATE ACCOUNT"
                            )}
                        </button>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Form from "@radix-ui/react-form";
import { X, Loader2, UserPlus, AlertCircle } from "lucide-react";
import { registerUser } from "@/api/axios";
import { SignInLoginField } from "@components/ui/SignInLoginField";
import { RegisterEmailField } from "@components/ui/RegisterEmailField";
import { RegisterPasswordFieldPair } from "@components/ui/RegisterPasswordFieldPair";
import "./AddUserModal.scss";


const UserRole = {
    Administrator: 0,
    WarehouseWorker: 1
} as const;

type UserRole = typeof UserRole[keyof typeof UserRole];

interface AddUserModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

// --- ZAKTUALIZOWANA KONFIGURACJA (zgodna z ResetPasswordPage) ---
const fieldsData = {
    username: {
        label: "Username",
        placeholder: "e.g. j.doe",
        validation: { required: "Username is required" }
    },
    email: {
        label: "Email",
        placeholder: "user@faraday.systems",
        validation: { required: "Email is required", invalid: "Invalid email" }
    },
    password: {
        label: "Password",
        placeholder: "Min 8 chars, number, symbol",
        validation: {
            required: "Password is required",
            tooShort: "Min 8 chars",      // Zmieniono z 6 na 8
            noNumber: "Need number",      // Wymagana cyfra
            noSpecialChar: "Need symbol"  // Wymagany znak specjalny (!@#$...)
        }
    },
    confirmPassword: {
        label: "Confirm Password",
        placeholder: "Re-enter password",
        validation: {
            required: "Confirmation is required",
            mismatch: "Passwords do not match"
        }
    }
};

export const AddUserModal = ({ open, onOpenChange, onSuccess }: AddUserModalProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Stany potrzebne do walidacji haseł
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [role, setRole] = useState<UserRole>(UserRole.WarehouseWorker);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        // Dodatkowe zabezpieczenie: sprawdzenie czy hasła są identyczne przed wysłaniem
        if (password !== confirmPassword) {
            return; // Komponent RegisterPasswordField wyświetli błąd walidacji, tu przerywamy
        }

        setIsLoading(true);

        const formData = new FormData(event.currentTarget);
        const payload = {
            username: formData.get("username") as string,
            email: formData.get("email") as string,
            password: formData.get("password") as string, // Bierzemy pierwsze hasło
            role: role
        };

        try {
            await registerUser(payload);
            onSuccess();
            onOpenChange(false);

            // Reset formularza po sukcesie
            setPassword("");
            setConfirmPassword("");
            setRole(UserRole.WarehouseWorker);
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
                <Dialog.Overlay className="dialog-overlay-ht" />

                <Dialog.Content
                    className="dialog-content-ht"
                    aria-describedby={undefined}
                >
                    <div className="modal-header">
                        <Dialog.Title asChild>
                            <h2>
                                <UserPlus size={24} className="icon-accent" />
                                New User
                            </h2>
                        </Dialog.Title>

                        <button className="btn-close" onClick={() => onOpenChange(false)}>
                            <X size={24} />
                        </button>
                    </div>

                    <Form.Root className="ht-form" onSubmit={handleSubmit}>

                        {/* 1. Username Field */}
                        <SignInLoginField
                            data={fieldsData.username}
                            name="username"
                        />

                        {/* 2. Email Field */}
                        <RegisterEmailField
                            data={fieldsData.email}
                        />

                        {/* 3. Password Field (Główne) */}
                        <RegisterPasswordFieldPair
                            passwordData={fieldsData.password}
                            confirmData={fieldsData.confirmPassword}
                            onChange={(password, confirm) => {
                                setPassword(password);
                                setConfirmPassword(confirm);
                            }}
                        />

                        {/* 5. Role Select */}
                        <div className="input-group">
                            <label style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: 'var(--text-muted, #a1a1aa)',
                                marginBottom: '0.5rem',
                                display: 'block'
                            }}>
                                Role
                            </label>
                            <select
                                className="ht-input"
                                value={role}
                                onChange={e => setRole(Number(e.target.value) as UserRole)}
                            >
                                <option value={UserRole.WarehouseWorker}>Warehouse Worker</option>
                                <option value={UserRole.Administrator}>Administrator</option>
                            </select>
                        </div>

                        {/* Global Error Banner */}
                        {error && (
                            <div className="error-banner" style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: '#ef4444',
                                padding: '12px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                fontSize: '0.85rem'
                            }}>
                                <AlertCircle size={16} />
                                <span>{error}</span>
                            </div>
                        )}

                        <Form.Submit asChild>
                            <button className="btn-submit-ht" disabled={isLoading}>
                                {isLoading ? (
                                    <><Loader2 className="animate-spin" size={20} /> Creating...</>
                                ) : (
                                    "CREATE ACCOUNT"
                                )}
                            </button>
                        </Form.Submit>
                    </Form.Root>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
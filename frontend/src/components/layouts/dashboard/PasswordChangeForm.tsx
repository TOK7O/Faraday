import { useState } from "react";
import * as Form from "@radix-ui/react-form";
import { Loader2, CheckCircle, AlertCircle, Save } from "lucide-react";

// Import the Simple component for "Old Password"
import { SignInPasswordField } from "@/components/ui/SignInPasswordField";

// Import the Pair component for "New Password" & "Confirm"
import { RegisterPasswordFieldPair } from "@/components/ui/RegisterPasswordFieldPair";

import { changePassword } from '@/api/axios';

import "./PasswordChangeForm.scss";

export const ChangePasswordForm = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Configuration for the fields
    const fieldConfig = {
        oldPassword: {
            label: "Current Password",
            placeholder: "Enter current password",
            validation: { required: "Current password is required" }
        },
        newPassword: {
            label: "New Password",
            placeholder: "Enter new password",
            validation: {
                required: "New password is required",
                tooShort: "Must be at least 8 characters",
                noNumber: "Must contain a number",
                noSpecialChar: "Must contain a special character"
            }
        },
        confirmPassword: {
            label: "Confirm New Password",
            placeholder: "Retype new password",
            validation: {
                required: "Confirmation is required",
                mismatch: "Passwords do not match"
            }
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        setMessage(null);
        setIsLoading(true);

        const formData = new FormData(form);
        const oldPassword = formData.get("oldPassword") as string;

        // UWAGA: Komponent RegisterPasswordFieldPair używa nazwy "password" dla pierwszego pola
        const newPassword = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: "New passwords do not match." });
            setIsLoading(false);
            return;
        }

        try {
            await changePassword(oldPassword, newPassword);
            setMessage({ type: 'success', text: "Password changed successfully." });

            // Reset form logic
            form.reset();
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || err.message || "Failed to update password";
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="settings-card">
            <div className="settings-header">
                <h3>Security Settings</h3>
                <p>Update your password to keep your account secure.</p>
            </div>

            <Form.Root className="settings-form" onSubmit={handleSubmit}>

                {/* Old Password: Uses SignInPasswordField (Simple, no checks) */}
                <SignInPasswordField
                    data={fieldConfig.oldPassword}
                    name="oldPassword"
                />

                <div className="form-divider" />

                {/* New Password Pair: Handles both new password and confirmation with validation */}
                <RegisterPasswordFieldPair
                    passwordData={fieldConfig.newPassword}
                    confirmData={fieldConfig.confirmPassword}
                />

                {/* Status Messages */}
                {message && (
                    <div className={`status-banner ${message.type}`}>
                        {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                        <span>{message.text}</span>
                    </div>
                )}

                {/* Submit Button */}
                <div className="form-actions">
                    <Form.Submit asChild>
                        <button type="submit" className="save-btn" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    <span>Updating...</span>
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    <span>Update Password</span>
                                </>
                            )}
                        </button>
                    </Form.Submit>
                </div>
            </Form.Root>
        </div>
    );
};
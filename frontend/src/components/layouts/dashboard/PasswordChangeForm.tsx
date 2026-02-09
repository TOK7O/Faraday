import { useState } from "react";
import * as Form from "@radix-ui/react-form";
import { Loader2, CheckCircle, AlertCircle, Save } from "lucide-react";

// Import the Simple component for "Old Password"
import { PasswordField as SignInPasswordField } from "@/components/ui/SignInPasswordField";

// Import the Complex component for "New Password" & "Confirm"
import { PasswordField as RegisterPasswordField } from "@/components/ui/RegisterPasswordField";

import "./PasswordChangeForm.scss";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const ChangePasswordForm = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // State to handle real-time matching for the Register components
    const [newPasswordValue, setNewPasswordValue] = useState("");

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

        // Capture form reference immediately
        const form = event.currentTarget;

        setMessage(null);
        setIsLoading(true);

        const formData = new FormData(form);
        const oldPassword = formData.get("oldPassword") as string;
        const newPassword = formData.get("newPassword") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        // 1. Client-side Validation: Match Check
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: "New passwords do not match." });
            setIsLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem("token");

            const response = await fetch(`${API_BASE_URL}/api/Auth/change-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    oldPassword,
                    newPassword
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = errorText;
                try {
                    const json = JSON.parse(errorText);
                    errorMessage = json.message || errorText;
                } catch { /* ignore */ }
                throw new Error(errorMessage || "Failed to change password");
            }

            setMessage({ type: 'success', text: "Password changed successfully." });

            form.reset();
            setNewPasswordValue(""); // Reset local state as well

        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
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

                {/* New Password: Uses RegisterPasswordField (Complexity checks) */}
                <RegisterPasswordField
                    data={fieldConfig.newPassword}
                    name="newPassword"
                    onPasswordChange={setNewPasswordValue} // Track value for matching
                />

                {/* Confirm Password: Uses RegisterPasswordField (Match check) */}
                <RegisterPasswordField
                    data={fieldConfig.confirmPassword}
                    name="confirmPassword"
                    matchPasswordValue={newPasswordValue} // Pass value to check match
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
                </div>
            </Form.Root>
        </div>
    );
};
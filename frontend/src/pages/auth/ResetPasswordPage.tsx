import { useState } from "react";
import * as Form from "@radix-ui/react-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { RegisterPasswordField } from "@/components/ui/RegisterPasswordField";
import { resetPassword } from '@/api/axios';
import "./login/LoginPage.scss";

const ResetPasswordPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [newPasswordValue, setNewPasswordValue] = useState("");

    if (!token) {
        return (
            <div className="auth-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ color: 'white', textAlign: 'center' }}>
                    <h2>Invalid Link</h2>
                    <p>This password reset link is invalid or missing a token.</p>
                </div>
            </div>
        );
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setIsLoading(true);

        const formData = new FormData(event.currentTarget);
        const newPassword = formData.get("newPassword") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            setIsLoading(false);
            return;
        }

        try {
            await resetPassword(token!, newPassword);

            navigate("/login");
        } catch (err) {
            setError("Failed to reset password. The link may have expired.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <section className="auth-visual">
                 <h1>Faraday<span>Systems</span></h1>
            </section>

            <section className="auth-form">
                <div className="form-header">
                    <h1>Set New Password</h1>
                    <p className="subtitle">Please enter your new credentials below.</p>
                </div>

                {error && (
                    <div className="error-banner" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '10px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '10px' }}>
                        <AlertCircle size={18} /> {error}
                    </div>
                )}

                <Form.Root className="actual-form" onSubmit={handleSubmit}>
                    <RegisterPasswordField
                        data={{ label: "New Password", placeholder: "Enter new password", validation: { required: "Required", tooShort: "Min 8 chars", noNumber: "Need number", noSpecialChar: "Need special char" } }}
                        name="newPassword"
                        onPasswordChange={setNewPasswordValue}
                    />

                    <RegisterPasswordField
                        data={{ label: "Confirm Password", placeholder: "Confirm password", validation: { required: "Required", mismatch: "Passwords do not match" } }}
                        name="confirmPassword"
                        matchPasswordValue={newPasswordValue}
                    />

                    <Form.Submit asChild>
                        <button className="submit-btn" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin" /> : "Reset Password"}
                        </button>
                    </Form.Submit>
                </Form.Root>
            </section>
        </div>
    );
};

export default ResetPasswordPage;


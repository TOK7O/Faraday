import { useState } from "react";
import * as Form from "@radix-ui/react-form";
import { Link } from "react-router-dom";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { LoginField } from "@components/ui/SignInLoginField";
import { forgotPassword } from '@/api/axios';
import "./login/LoginPage.scss";

const ForgotPasswordPage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);
        const formData = new FormData(event.currentTarget);
        const email = formData.get("email") as string;
        try {
            await forgotPassword(email);
            setIsSent(true);
        } catch (err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <section className="auth-visual">
                 <Link to="/"><h1>Faraday<span>Systems</span></h1></Link>
                 <div className="content-bottom">
                     <h2 className="outline-text">Recovery</h2>
                     <p>Lost your credentials? We'll help you get back on track.</p>
                 </div>
            </section>

            <section className="auth-form">
                <div className="form-header">
                    <h1>Reset Password</h1>
                    <p className="subtitle">Enter your email to receive a reset link.</p>
                </div>

                {isSent ? (
                    <div className="actual-form" style={{ textAlign: 'center' }}>
                        <div style={{ margin: '2rem 0', color: '#34d399' }}>
                            <CheckCircle size={64} style={{ margin: '0 auto' }} />
                        </div>
                        <p style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '2rem' }}>
                            If an account exists for that email, we have sent password reset instructions.
                        </p>
                        <Link to="/login" className="submit-btn" style={{ textDecoration: 'none' }}>
                            Return to Login
                        </Link>
                    </div>
                ) : (
                    <Form.Root className="actual-form" onSubmit={handleSubmit}>
                        <LoginField 
                            data={{ label: "Email Address", placeholder: "name@company.com", validation: { required: "Email is required" } }}
                            name="email"
                        />
                        
                        {error && <p style={{ color: '#ef4444', fontSize: '0.9rem' }}>{error}</p>}

                        <Form.Submit asChild>
                            <button className="submit-btn" disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin" /> : "Send Reset Link"}
                            </button>
                        </Form.Submit>
                        
                        <div className="form-footer">
                            <Link to="/login" className="register-link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                <ArrowLeft size={16} /> Back to Login
                            </Link>
                        </div>
                    </Form.Root>
                )}
            </section>
        </div>
    );
};

export default ForgotPasswordPage;

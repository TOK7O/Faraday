import { useState } from "react";
import * as Form from "@radix-ui/react-form";
import { Eye, EyeOff } from "lucide-react";
import { Link } from 'react-router-dom';

interface PasswordFieldProps {
    data: any;
    forgotPasswordLabel?: string;
    name?: string;
}

export const PasswordField = ({
                                  data,
                                  forgotPasswordLabel,
                                  name = "password",
                              }: PasswordFieldProps) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <Form.Field className="input-group" name={name}>
            <div className="label-row">
                <Form.Label className="ht-label">{data?.label || "Password"}</Form.Label>
                <Form.Message className="error-text" match="valueMissing">
                    {data?.validation?.required || "Required"}
                </Form.Message>
            </div>

            <div className="password-wrapper" style={{ position: 'relative' }}>
                <Form.Control asChild>
                    <input
                        className="ht-input"
                        type={showPassword ? "text" : "password"}
                        placeholder={data?.placeholder}
                        required
                        autoComplete="current-password"
                        style={{ paddingRight: '0px', width: '100%', boxSizing: 'border-box' }}
                    />
                </Form.Control>

                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                    style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center'
                    }}
                >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
            </div>

            {forgotPasswordLabel && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <Link to="/forgot-password" className="forgot-link" style={{ fontSize: '0.9rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        {forgotPasswordLabel}
                    </Link>
                </div>
            )}
        </Form.Field>
    );
};
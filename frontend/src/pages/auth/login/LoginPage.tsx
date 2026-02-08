import { useState } from "react";
import * as Form from "@radix-ui/react-form";
import { useTranslation } from "@/context/LanguageContext";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { LoginField } from "@components/ui/SignInLoginField";
import { PasswordField } from "@components/ui/SignInPasswordField";
import "./LoginPage.scss";

// Load API URL from environment variables or fallback to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const loginStrings = t.loginPage.formSection;

  // State to hold credentials temporarily between 1st step (Login) and 2nd step (2FA)
  const [tempCreds, setTempCreds] = useState({ username: "", password: "" });
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const [status, setStatus] = useState<{
    isLoading: boolean;
    error: string | null;
    requires2FA: boolean;
  }>({
    isLoading: false,
    error: null,
    requires2FA: false,
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus((prev) => ({ ...prev, isLoading: true, error: null }));

    // Extract data from the form event
    const formData = new FormData(event.currentTarget);

    let payload;

    if (status.requires2FA) {
      // --- STEP 2: Send stored creds + entered 2FA code ---
      payload = {
        username: tempCreds.username,
        password: tempCreds.password,
        twoFactorCode: twoFactorCode
      };
    } else {
      // --- STEP 1: Send username & password ---
      const username = formData.get("username") as string;
      const password = formData.get("password") as string;

      // Save to state in case we need them for Step 2
      setTempCreds({ username, password });

      payload = {
        username,
        password,
        twoFactorCode: ""
      };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/Auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // CASE: 2FA Required (Backend returns 428 Precondition Required)
      if (response.status === 428) {
        setStatus({ isLoading: false, error: null, requires2FA: true });
        return;
      }

      // CASE: Error
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = errorText;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorText;
        } catch { /* ignore JSON parse error */ }

        throw new Error(errorMessage || "Login failed");
      }

      // CASE: Success
      const data = await response.json();

      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);
      localStorage.setItem("role", data.role);

      navigate("/dashboard");
    } catch (err: any) {
      console.error("Login Error:", err);
      setStatus((prev) => ({
        ...prev,
        isLoading: false,
        error: err.message || "Unable to connect to server.",
      }));
    }
  };

  return (
      <div className="auth-container">
        {/* --- Visual Section --- */}
        <section className="auth-visual">
          <Link to="/">
            <h1>
              Faraday<span>Systems</span>
            </h1>
          </Link>
          <div className="content-bottom">
            <h2 className="outline-text">{t.loginPage.visualSection.title}</h2>
            <p>{t.loginPage.visualSection.description}</p>
          </div>
        </section>

        {/* --- Form Section --- */}
        <section className="auth-form">
          <div className="form-header">
            <h1>
              {status.requires2FA ? "Security Check" : loginStrings.header.title}
            </h1>
            <p className="subtitle">
              {status.requires2FA
                  ? "Please enter the 6-digit code from your authenticator app."
                  : loginStrings.header.subtitle}
            </p>
          </div>

          {/* Global Error Banner */}
          {status.error && (
              <div className="error-banner" style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.9rem'
              }}>
                <AlertCircle size={18} />
                <span>{status.error}</span>
              </div>
          )}

          {/* Form Root with "actual-form" class ensures gap works correctly */}
          <Form.Root className="actual-form" onSubmit={handleSubmit}>
            {!status.requires2FA ? (
                /* --- STEP 1: Standard Login --- */
                <>
                  {/* LoginField & PasswordField render .input-group divs directly */}
                  <LoginField
                      data={loginStrings.fields.email}
                      name="username"
                  />

                  <PasswordField
                      data={loginStrings.fields.password}
                      name="password"
                      forgotPasswordLabel={loginStrings.buttons.forgotPassword}
                  />
                </>
            ) : (
                /* --- STEP 2: 2FA Code --- */
                /* Manual structure matching .input-group styles */
                <Form.Field name="twoFactorCode" className="input-group fade-in">
                  <div className="label-row">
                    <Form.Label className="ht-label" style={{ color: 'var(--accent-primary)' }}>
                      Authenticator Code
                    </Form.Label>
                  </div>

                  {/* Wrapper div outside Form.Control for correct layout */}
                  <div className="password-wrapper" style={{ position: 'relative' }}>
                    <ShieldCheck
                        size={20}
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          opacity: 0.5,
                          pointerEvents: 'none',
                          color: 'white'
                        }}
                    />
                    <Form.Control asChild>
                      <input
                          className="ht-input"
                          type="text"
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value)}
                          placeholder="000 000"
                          required
                          autoFocus
                          autoComplete="off"
                          style={{
                            paddingLeft: '45px',
                            letterSpacing: '4px',
                            fontWeight: 'bold',
                            fontSize: '1.2rem'
                          }}
                      />
                    </Form.Control>
                  </div>
                </Form.Field>
            )}

            {/* Direct Button child - No Form.Submit wrapper to preserve Flex gap */}
            <button
                type="submit"
                className="submit-btn"
                disabled={status.isLoading}
            >
              {status.isLoading ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Processing...</span>
                  </div>
              ) : status.requires2FA ? (
                  "Verify Code"
              ) : (
                  loginStrings.buttons.submit
              )}
            </button>
          </Form.Root>

          {!status.requires2FA && (
              <div className="form-footer">
                <span>{loginStrings.footer.text} </span>
                <Link to={loginStrings.footer.linkUrl} className="register-link">
                  {loginStrings.footer.linkText}
                </Link>
              </div>
          )}
        </section>
      </div>
  );
};

export default LoginPage;
import { useState } from "react";
import * as Form from "@radix-ui/react-form";
import { useTranslation } from "@/context/LanguageContext";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { SignInLoginField } from "@components/ui/SignInLoginField";
import { SignInPasswordField } from "@components/ui/SignInPasswordField";
import { login } from "@/api/axios";
import "./LoginPage.scss";

const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const loginStrings = t.loginPage.formSection;

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

    const formData = new FormData(event.currentTarget);
    let payload;

    if (status.requires2FA) {
      payload = {
        username: tempCreds.username,
        password: tempCreds.password,
        twoFactorCode: twoFactorCode,
      };
    } else {
      const username = formData.get("username") as string;
      const password = formData.get("password") as string;

      setTempCreds({ username, password });

      payload = {
        username,
        password,
        twoFactorCode: "",
      };
    }

    try {
      const response = await login(
        payload.username,
        payload.password,
        payload.twoFactorCode,
      );

      const data = response.data;
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);
      localStorage.setItem("role", data.role);

      navigate("/dashboard");
    } catch (err: any) {
      if (err.response && err.response.status === 428) {
        setStatus({ isLoading: false, error: null, requires2FA: true });
        return;
      }

      console.error("Login Error:", err);

      let errorMessage = "Unable to connect to server.";

      if (err.response) {
        const responseData = err.response.data;

        if (typeof responseData === "string") {
          errorMessage = responseData;
        } else if (responseData && responseData.message) {
          errorMessage = responseData.message;
        } else {
          errorMessage = `Server Error (${err.response.status})`;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      setStatus((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  };

  return (
    <div className="auth-container">
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

        {status.error && (
          <div
            className="error-banner"
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#ef4444",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "0.9rem",
            }}
          >
            <AlertCircle size={18} />
            <span>{status.error}</span>
          </div>
        )}

        <Form.Root className="actual-form" onSubmit={handleSubmit}>
          {!status.requires2FA ? (
            <>
              <SignInLoginField
                data={loginStrings.fields.email}
                name="username"
              />

              <SignInPasswordField
                data={loginStrings.fields.password}
                name="password"
                forgotPasswordLabel={loginStrings.buttons.forgotPassword}
              />
            </>
          ) : (
            <Form.Field name="twoFactorCode" className="input-group fade-in">
              <div className="label-row">
                <Form.Label
                  className="ht-label"
                  style={{ color: "var(--accent-primary)" }}
                >
                  Authenticator Code
                </Form.Label>
              </div>

              <div
                className="password-wrapper"
                style={{ position: "relative" }}
              >
                <ShieldCheck
                  size={20}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    opacity: 0.5,
                    pointerEvents: "none",
                    color: "white",
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
                      paddingLeft: "45px",
                      letterSpacing: "4px",
                      fontWeight: "bold",
                      fontSize: "1.2rem",
                    }}
                  />
                </Form.Control>
              </div>
            </Form.Field>
          )}

          <button
            type="submit"
            className="submit-btn"
            disabled={status.isLoading}
          >
            {status.isLoading ? (
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
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
      </section>
    </div>
  );
};

export default LoginPage;

import React, { useState } from "react";
import * as Form from "@radix-ui/react-form";
import { Link } from "react-router-dom";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { SignInLoginField } from "@components/ui/SignInLoginField";
import { forgotPassword } from "@/api/axios";
import { useTranslation } from "@/context/LanguageContext";
import "./login/LoginPage.scss";

const ForgotPasswordPage = () => {
  const { t } = useTranslation();
  const pageT = t.forgotPasswordPage;

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
      setError(pageT.formSection.genericError);
    } finally {
      setIsLoading(false);
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
          <h2 className="outline-text">{pageT.visualSection.title}</h2>
          <p>{pageT.visualSection.description}</p>
        </div>
      </section>

      <section className="auth-form">
        <div className="form-header">
          <h1>{pageT.formSection.title}</h1>
          <p className="subtitle">{pageT.formSection.subtitle}</p>
        </div>

        {isSent ? (
          <div className="actual-form" style={{ textAlign: "center" }}>
            <div style={{ margin: "2rem 0", color: "#34d399" }}>
              <CheckCircle size={64} style={{ margin: "0 auto" }} />
            </div>
            <p
              style={{
                color: "#fff",
                fontSize: "1.1rem",
                marginBottom: "2rem",
              }}
            >
              {pageT.formSection.successMessage}
            </p>
            <Link
              to="/login"
              className="submit-btn"
              style={{ textDecoration: "none" }}
            >
              {pageT.formSection.returnToLogin}
            </Link>
          </div>
        ) : (
          <Form.Root className="actual-form" onSubmit={handleSubmit}>
            <SignInLoginField
              data={{
                label: pageT.formSection.emailLabel,
                placeholder: pageT.formSection.emailPlaceholder,
                validation: { required: pageT.formSection.emailRequired },
              }}
              name="email"
            />

            {error && (
              <p style={{ color: "#ef4444", fontSize: "0.9rem" }}>{error}</p>
            )}

            <Form.Submit asChild>
              <button className="submit-btn" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  pageT.formSection.sendButton
                )}
              </button>
            </Form.Submit>

            <div className="form-footer">
              <Link
                to="/login"
                className="register-link"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                }}
              >
                <ArrowLeft size={16} /> {pageT.formSection.backToLogin}
              </Link>
            </div>
          </Form.Root>
        )}
      </section>
    </div>
  );
};

export default ForgotPasswordPage;

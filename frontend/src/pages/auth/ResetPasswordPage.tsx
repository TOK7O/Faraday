import React, { useState } from "react";
import * as Form from "@radix-ui/react-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { RegisterPasswordFieldPair } from "@/components/ui/RegisterPasswordFieldPair";
import { resetPassword } from "@/api/axios";
import { useTranslation } from "@/context/LanguageContext";
import "./login/LoginPage.scss";

const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const pageT = t.resetPasswordPage;

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div
        className="auth-container"
        style={{ justifyContent: "center", alignItems: "center" }}
      >
        <div style={{ color: "white", textAlign: "center" }}>
          <h2>{pageT.invalidLink.title}</h2>
          <p>{pageT.invalidLink.description}</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const newPassword = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      setError(pageT.formSection.passwordsMismatch);
      setIsLoading(false);
      return;
    }

    try {
      await resetPassword(token, newPassword);
      navigate("/login");
    } catch (err) {
      setError(pageT.formSection.resetError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <section className="auth-visual">
        <Link to={"/"}>
          <h1>
            Faraday<span>Systems</span>
          </h1>
        </Link>
      </section>

      <section className="auth-form">
        <div className="form-header">
          <h1>{pageT.formSection.title}</h1>
          <p className="subtitle">{pageT.formSection.subtitle}</p>
        </div>

        {error && (
          <div
            className="error-banner"
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              color: "#ef4444",
              padding: "10px",
              borderRadius: "8px",
              marginBottom: "20px",
              display: "flex",
              gap: "10px",
            }}
          >
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <Form.Root className="actual-form" onSubmit={handleSubmit}>
          <RegisterPasswordFieldPair
            passwordData={{
              label: pageT.formSection.newPasswordLabel,
              placeholder: pageT.formSection.newPasswordPlaceholder,
              validation: {
                required: pageT.formSection.validation.required,
                tooShort: pageT.formSection.validation.tooShort,
                noNumber: pageT.formSection.validation.noNumber,
                noSpecialChar: pageT.formSection.validation.noSpecialChar,
              },
            }}
            confirmData={{
              label: pageT.formSection.confirmPasswordLabel,
              placeholder: pageT.formSection.confirmPasswordPlaceholder,
              validation: {
                required: pageT.formSection.validation.required,
                mismatch: pageT.formSection.passwordsMismatch,
              },
            }}
          />

          <Form.Submit asChild>
            <button className="submit-btn" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                pageT.formSection.resetButton
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
      </section>
    </div>
  );
};

export default ResetPasswordPage;

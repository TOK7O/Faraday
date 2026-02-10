import { registerUser } from '@/api/axios';
import { useTranslation } from "@/context/LanguageContext.tsx";
import AuthForm from "@components/layouts/auth/AuthForm.tsx";
import { EmailField } from "@components/ui/RegisterEmailField.tsx";
import { PasswordField } from "@components/ui/RegisterPasswordField.tsx";
import { useState } from "react";
import "../login/LoginPage.scss";
import { Link } from "react-router-dom";
import { AlertCircle, ShieldCheck } from 'lucide-react';

const RegisterPage = () => {
  const { t } = useTranslation();
  const [password, setFirstPassword] = useState("");
  const [status, setStatus] = useState<{ isLoading: boolean; error: string | null; success: boolean }>({
    isLoading: false,
    error: null,
    success: false,
  });
  const regStrings = t.registerPage.formSection;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ isLoading: true, error: null, success: false });
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    if (password !== confirmPassword) {
      setStatus({ isLoading: false, error: 'Hasła nie są zgodne.', success: false });
      return;
    }
    try {
      const username = email;
      const response = await registerUser(username, email, password);
      if (response.status >= 200 && response.status < 300) {
        setStatus({ isLoading: false, error: null, success: true });
      } else {
        setStatus({ isLoading: false, error: response.data?.message || 'Błąd rejestracji.', success: false });
      }
    } catch (err: any) {
      setStatus({ isLoading: false, error: err.response?.data?.message || err.message || 'Błąd rejestracji.', success: false });
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
          <h2 className="outline-text">{t.registerPage.visualSection.title}</h2>
          <p>{t.registerPage.visualSection.description}</p>
        </div>
      </section>

      <section className="auth-form">
        <div className="form-header">
          <h1>{regStrings.header.title}</h1>
          <p className="subtitle">{regStrings.header.subtitle}</p>
        </div>

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
        {status.success && (
          <div className="success-banner" style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            color: '#4ade80',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem'
          }}>
            <ShieldCheck size={18} />
            <span>Konto zostało utworzone. Skontaktuj się z administratorem w celu aktywacji.</span>
          </div>
        )}
        <AuthForm config={regStrings} onSubmit={handleRegister}>
          <EmailField data={regStrings.fields.email} />

          <div
            onChange={(e: any) =>
              e.target.name === "password" && setFirstPassword(e.target.value)
            }
          >
            <PasswordField
              data={regStrings.fields.password}
              name="password"
              onPasswordChange={(val) => setFirstPassword(val)}
            />
          </div>

          <PasswordField
            data={regStrings.fields.confirmPassword}
            name="confirmPassword"
            matchPasswordValue={password}
          />
        </AuthForm>
      </section>
    </div>
  );
};

export default RegisterPage;

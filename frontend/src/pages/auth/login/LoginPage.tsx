import { useTranslation } from "@/context/LanguageContext.tsx";
import AuthForm from "@components/layouts/auth/AuthForm.tsx";
import { EmailField } from "@components/ui/EmailField.tsx";
import { PasswordField } from "@components/ui/PasswordField.tsx";
import { Link } from "react-router-dom";
import "./LoginPage.scss";

const LoginPage = () => {
  const { t } = useTranslation();
  const loginStrings = t.loginPage.formSection;

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
          <h1>{loginStrings.header.title}</h1>
          <p className="subtitle">{loginStrings.header.subtitle}</p>
        </div>

        <AuthForm config={loginStrings}>
          <EmailField data={loginStrings.fields.email} />

          <PasswordField
            data={loginStrings.fields.password}
            forgotPasswordLabel={loginStrings.buttons.forgotPassword}
          />
        </AuthForm>
      </section>
    </div>
  );
};

export default LoginPage;

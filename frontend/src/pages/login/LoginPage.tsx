import { useTranslation } from "../../context/LanguageContext";
import AuthForm from "../../components/layouts/AuthForm";
import { EmailField } from "../../components/ui/EmailField";
import { PasswordField } from "../../components/ui/PasswordField";
import "./LoginPage.scss";

const LoginPage = () => {
  const { t } = useTranslation();
  const loginStrings = t.loginPage.formSection;

  return (
    <div className="auth-container">
      <section className="auth-visual">
        <h1>Faraway</h1>
        <h2>{t.loginPage.visualSection.title}</h2>
        <p>{t.loginPage.visualSection.description}</p>
      </section>

      <section className="auth-form">
        <h1>{loginStrings.header.title}</h1>
        <p className="subtitle">{loginStrings.header.subtitle}</p>

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

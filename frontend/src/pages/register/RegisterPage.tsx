import { useTranslation } from "../../context/LanguageContext";
import AuthForm from "../../components/AuthForm";
import { EmailField } from "../../components/ui/EmailField";
import { PasswordField } from "../../components/ui/PasswordField";
import { useState } from "react";

const RegisterPage = () => {
  const { t } = useTranslation();
  const [password, setFirstPassword] = useState("");

  return (
    <div className="auth-container">
      <section className="auth-visual">
        <h1>Faraway</h1>
        <h2>{t.registerPage.visualSection.title}</h2>
        <p>{t.registerPage.visualSection.description}</p>
      </section>

      <section className="auth-form">
        <h1>{t.registerPage.formSection.header.title}</h1>
        <p className="subtitle">{t.registerPage.formSection.header.subtitle}</p>

        <AuthForm config={t.registerPage.formSection}>
          <EmailField data={t.registerPage.formSection.fields.email} />
          <div
            onChange={(e: any) =>
              e.target.name === "password" && setFirstPassword(e.target.value)
            }
          >
            <PasswordField
              data={t.registerPage.formSection.fields.password}
              name="password"
              onPasswordChange={(val) => setFirstPassword(val)}
            />
          </div>

          <PasswordField
            data={t.registerPage.formSection.fields.confirmPassword}
            name="confirmPassword"
            matchPasswordValue={password}
          />
        </AuthForm>
      </section>
    </div>
  );
};

export default RegisterPage;

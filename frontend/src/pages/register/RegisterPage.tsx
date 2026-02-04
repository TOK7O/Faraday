import { useTranslation } from "../../context/LanguageContext";
import AuthForm from "../../components/layouts/AuthForm";
import { EmailField } from "../../components/ui/EmailField";
import { PasswordField } from "../../components/ui/PasswordField";
import { useState } from "react";
import "../login/LoginPage.scss";
import { Link } from "react-router-dom";

const RegisterPage = () => {
  const { t } = useTranslation();
  const [password, setFirstPassword] = useState("");
  const regStrings = t.registerPage.formSection;

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

        <AuthForm config={regStrings}>
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

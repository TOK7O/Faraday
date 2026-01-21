import { useTranslation } from "../../context/LanguageContext";
import LanguageButton from "../../components/ui/LanguageButton";
import AuthForm from "../../components/AuthForm";
import "./LoginPage.scss";

const LoginPage = () => {
  const { t } = useTranslation();

  //const handleLogin = (data: any) => console.log(data);
  return (
    <div className="auth-container">
      <section className="auth-visual">
        <h1>Faraway</h1>
        <h2>{t.loginPage.visualSection.title}</h2>
        <p>{t.loginPage.visualSection.description}</p>
      </section>
      <section className="auth-form">
        <h1>{t.loginPage.formSection.header.title}</h1>
        <p>{t.loginPage.formSection.header.subtitle}</p>
        <AuthForm config={t.loginPage.formSection} />
      </section>
    </div>
  );
};
export default LoginPage;

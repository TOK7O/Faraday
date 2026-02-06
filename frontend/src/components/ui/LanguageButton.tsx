import { useTranslation } from "../../context/LanguageContext";

const LanguageButton = () => {
  const { lang, setLang, t } = useTranslation();

  const toggleLang = () => {
    setLang(lang === "pl" ? "en" : "pl");
  };

  return (
    <button onClick={toggleLang}>
      {t.homePage.language.toggle}
    </button>
  );
};

export default LanguageButton;

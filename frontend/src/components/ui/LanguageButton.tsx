import { useTranslation } from "../../context/LanguageContext";

const LanguageButton = () => {
    const { lang, setLang } = useTranslation();

    const toggleLang = () => {
        setLang(lang === "pl" ? "en" : "pl");
    };

    return (
        <button onClick={toggleLang}>
            {lang === "pl" ? "Zmień na EN" : "Zmień na PL"}
        </button>
    );
};

export default LanguageButton;
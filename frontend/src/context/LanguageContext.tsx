import React, { createContext, useContext, useState, useEffect } from "react";
import pl from "../data/pl.json";
import en from "../data/en.json";

export type Translation = typeof pl;
type Language = "pl" | "en";

interface LanguageContextType {
  lang: Language;
  t: Translation;
  setLang: (lang: Language) => void;
}

const translations = { pl, en };

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // 1. Inicjalizacja: sprawdzamy localStorage, w przeciwnym razie domyślnie "en"
  const [lang, setLang] = useState<Language>(() => {
    const savedLang = localStorage.getItem("app_language");
    return savedLang === "pl" || savedLang === "en" ? savedLang : "en";
  });

  // 2. Zapis: przy każdej zmianie 'lang' aktualizujemy localStorage
  useEffect(() => {
    localStorage.setItem("app_language", lang);
  }, [lang]);

  const value = {
    lang,
    t: translations[lang],
    setLang,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context)
    throw new Error("useTranslation must be used within LanguageProvider");
  return context;
};

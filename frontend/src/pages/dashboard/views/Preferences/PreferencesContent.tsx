import {
  Palette,
  Languages,
  Moon,
  Sun,
  Globe,
  Check
} from 'lucide-react';
import "./PreferencesContent.scss";

import { useTranslation } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

const PreferencesContent = () => {
  const { lang, setLang, t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const prefT = t.preferences;
  
  const handleThemeChange = (selectedTheme: 'light' | 'dark') => {
    if (theme !== selectedTheme) {
      toggleTheme();
    }
  };

  return (
    <div className="preferences-view">
      <div className="view-header">
        <h2>{prefT.title}</h2>
        <p className="text-muted">{prefT.description}</p>
      </div>

      <div className="preferences-grid">

        <div className="pref-section">
          <div className="section-header">
            <Palette size={20} className="icon-accent" />
            <h3>{prefT.theme.title}</h3>
          </div>

          <div className="options-row">
            <button
              className={`option-card ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => handleThemeChange('dark')}
            >
              <div className="card-icon">
                <Moon size={24} />
              </div>
              <div className="card-info">
                <span className="label">{prefT.theme.darkMode}</span>
                <span className="sub-label">{prefT.theme.darkModeDesc}</span>
              </div>
              {theme === 'dark' && <div className="check-badge"><Check size={14} /></div>}
            </button>

            <button
              className={`option-card ${theme === 'light' ? 'active' : ''}`}
              onClick={() => handleThemeChange('light')}
            >
              <div className="card-icon">
                <Sun size={24} />
              </div>
              <div className="card-info">
                <span className="label">{prefT.theme.lightMode}</span>
                <span className="sub-label">{prefT.theme.lightModeDesc}</span>
              </div>
              {theme === 'light' && <div className="check-badge"><Check size={14} /></div>}
            </button>
          </div>
        </div>

        <div className="pref-section">
          <div className="section-header">
            <Languages size={20} className="icon-accent" />
            <h3>{prefT.language.title}</h3>
          </div>

          <div className="options-row">
            <button
              className={`option-card ${lang === 'en' ? 'active' : ''}`}
              onClick={() => setLang('en')}
            >
              <div className="card-icon">
                <Globe size={24} />
              </div>
              <div className="card-info">
                <span className="label">{prefT.language.english}</span>
              </div>
              {lang === 'en' && <div className="check-badge"><Check size={14} /></div>}
            </button>

            <button
              className={`option-card ${lang === 'pl' ? 'active' : ''}`}
              onClick={() => setLang('pl')}
            >
              <div className="card-icon">
                <Globe size={24} />
              </div>
              <div className="card-info">
                <span className="label">{prefT.language.polish}</span>
              </div>
              {lang === 'pl' && <div className="check-badge"><Check size={14} /></div>}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PreferencesContent;
import {
  Palette,
  Languages,
  Moon,
  Sun,
  Globe,
  Check,
  Shield // Added icon for the security section
} from 'lucide-react';
import "./PreferencesContent.scss";

import { useTranslation } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { ChangePasswordForm } from "@components/layouts/dashboard/PasswordChangeForm.tsx";

const PreferencesContent = () => {
  const { lang, setLang, t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  // Safe access to translation object with fallback to prevent crashes if keys are missing
  const prefT = t.preferences || {
    title: "Preferences",
    description: "Manage your interface settings",
    theme: { title: "Theme", darkMode: "Dark Mode", lightMode: "Light Mode" },
    language: { title: "Language", english: "English", polish: "Polish" }
  };

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

          {/* --- Theme Section --- */}
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

          {/* --- Language Section --- */}
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

          {/* --- Security / Change Password Section --- */}
          <div className="pref-section full-width">
            <div className="section-header">
              <Shield size={20} className="icon-accent" />
              <h3>Security</h3>
            </div>

            {/* Rendering the dedicated form component */}
            <ChangePasswordForm />
          </div>

        </div>
      </div>
  );
};

export default PreferencesContent;
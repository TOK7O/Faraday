import { Activity } from "lucide-react";
import { Link } from "react-router-dom";
import "./HomePage.scss";
import { useTranslation } from "@/context/LanguageContext";

const HomePage = () => {
  const { t } = useTranslation();

  return (
    <div className="faraday-landing">
      <div className="bg-grid-overlay"></div>

      <header className="top-nav">
        <div className="logo-section">
          <span className="brand-name">
            Faraday<span>Systems</span>
          </span>
        </div>
        <div className="nav-actions">
          {/* some elements in navigation are only temporary, for easier accesibility*/}
          <Link to="/docs">
            <button>{t.homePage.nav.documentation}</button>
          </Link>
          <Link to="/dashboard">
            <button>{t.homePage.nav.dashboard}</button>
          </Link>
          <Link to="/login">
            <button>{t.homePage.nav.login}</button>
          </Link>
        </div>
      </header>

      <main className="hero-creative">
        <div className="hero-main-content">
          <div className="status-pill">
            <span className="pulse"></span> {t.homePage.hero.statusPill}
          </div>
          <h1>
            {t.homePage.hero.title.line1} <br />
            <span className="outline-text">
              {t.homePage.hero.title.line2}
            </span>{" "}
            <br />
            {t.homePage.hero.title.line3}
          </h1>
          <p>{t.homePage.hero.description}</p>
        </div>

        <div className="hero-widget">
          <div className="glass-card">
            <div className="card-head">
              <Activity size={16} />{" "}
              <span>{t.homePage.hero.liveEnvironment.title}</span>
            </div>
            <div className="sensor-data">
              <div className="reading">
                <span className="label">
                  {t.homePage.hero.liveEnvironment.avgTemp}
                </span>
                <span className="val">4.2°C</span>
              </div>
              <div className="reading">
                <span className="label">
                  {t.homePage.hero.liveEnvironment.humidity}
                </span>
                <span className="val">32%</span>
              </div>
            </div>
            <div className="mini-chart">
              {[40, 70, 45, 90, 65, 80].map((h, i) => (
                <div key={i} className="bar" style={{ height: `${h}%` }}></div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;

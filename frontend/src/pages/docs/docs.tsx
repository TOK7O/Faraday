import { BookOpen, Info, Package, Thermometer, Search } from "lucide-react";
import { Link } from "react-router-dom";
import "./docs.scss";
import { useTranslation } from "@/context/LanguageContext";

const Documentation = () => {
  const { t } = useTranslation();

  return (
    <div className="faraday-docs">
      <div className="bg-grid-overlay"></div>

      <header className="docs-nav-top">
        <Link to="/" className="brand-name">
          Faraday<span>Systems</span>
        </Link>
        <Link to="/dashboard" className="btn-dashboard">
          {t.docsPage.nav.dashboard}
        </Link>
      </header>

      <div className="docs-layout">
        <aside className="docs-sidebar">
          <div className="sidebar-header">
            <BookOpen size={18} />
            <span>{t.docsPage.sidebar.userManual}</span>
          </div>
          <nav>
            <a href="#intro" className="active">
              {t.docsPage.sidebar.nav.introduction}
            </a>
          </nav>
        </aside>

        <main className="docs-content">
          <section id="intro" className="docs-section">
            <div className="status-pill">{t.docsPage.content.intro.guide}</div>
            <h1>
              {t.docsPage.content.intro.title.split("Faraday")[0]}
              <span className="outline-text">Faraday</span>
              {t.docsPage.content.intro.title.split("Faraday")[1]}
            </h1>
            <p className="lead-text">{t.docsPage.content.intro.description}</p>

            <div className="info-card">
              <div className="card-glass-effect"></div>
              <Info className="icon" size={20} />
              <div className="info-text">
                <strong>{t.docsPage.content.intro.quickTip.label}</strong>{" "}
                {t.docsPage.content.intro.quickTip.text}
              </div>
            </div>
          </section>

          <section id="adding" className="docs-section">
            <h2>
              <Package size={22} /> {t.docsPage.content.addingProducts.title}
            </h2>
            <div className="step-list">
              <div className="step-item">
                <span className="step-num">01</span>
                <p>
                  {
                    t.docsPage.content.addingProducts.steps.step1.split(
                      "Warehouse",
                    )[0]
                  }
                  <strong>Warehouse</strong>
                  {
                    t.docsPage.content.addingProducts.steps.step1.split(
                      "Warehouse",
                    )[1]
                  }
                </p>
              </div>
              <div className="step-item">
                <span className="step-num">02</span>
                <p>
                  {
                    t.docsPage.content.addingProducts.steps.step2.split(
                      "Add Product",
                    )[0]
                  }
                  <strong>
                    {t.docsPage.content.addingProducts.steps.step2.includes(
                      "Add Product",
                    )
                      ? "Add Product"
                      : t.docsPage.content.addingProducts.steps.step2.includes(
                            "Dodaj produkt",
                          )
                        ? "Dodaj produkt"
                        : ""}
                  </strong>
                  {t.docsPage.content.addingProducts.steps.step2.includes(
                    "Add Product",
                  )
                    ? t.docsPage.content.addingProducts.steps.step2.split(
                        "Add Product",
                      )[1]
                    : t.docsPage.content.addingProducts.steps.step2.includes(
                          "Dodaj produkt",
                        )
                      ? t.docsPage.content.addingProducts.steps.step2.split(
                          "Dodaj produkt",
                        )[1]
                      : ""}
                </p>
              </div>
              <div className="step-item">
                <span className="step-num">03</span>
                <p>{t.docsPage.content.addingProducts.steps.step3}</p>
              </div>
            </div>

            <div className="hint-box">
              <Search size={14} />
              <span>{t.docsPage.content.addingProducts.hint}</span>
            </div>
          </section>

          <section id="monitoring" className="docs-section">
            <h2>
              <Thermometer size={22} /> {t.docsPage.content.monitoring.title}
            </h2>
            <p>{t.docsPage.content.monitoring.description}</p>
            <div className="indicator-grid">
              <div className="indicator-item">
                <span className="dot success"></span>
                <div className="indicator-desc">
                  <strong>
                    {
                      t.docsPage.content.monitoring.indicators.green.split(
                        ":",
                      )[0]
                    }
                    :
                  </strong>
                  {t.docsPage.content.monitoring.indicators.green.split(":")[1]}
                </div>
              </div>
              <div className="indicator-item">
                <span className="dot error"></span>
                <div className="indicator-desc">
                  <strong>
                    {t.docsPage.content.monitoring.indicators.red.split(":")[0]}
                    :
                  </strong>
                  {t.docsPage.content.monitoring.indicators.red.split(":")[1]}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Documentation;

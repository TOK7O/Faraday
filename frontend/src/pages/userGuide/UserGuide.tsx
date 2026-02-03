import {
  BookOpen,
  Info,
  Package,
  Thermometer,
  ShieldAlert,
  MousePointerClick,
  Search,
} from "lucide-react";
import "./UserGuide.scss";

const UserGuide = () => {
  return (
    <div className="guide-container">
      <aside className="guide-nav">
        <div className="guide-header">
          <BookOpen size={20} />
          <span>Instrukcja obsługi</span>
        </div>
        <nav>
          <a href="#intro" className="active">
            Wprowadzenie
          </a>
          <a href="#adding">Dodawanie produktów</a>
          <a href="#warehouse">Zarządzanie magazynem</a>
          <a href="#monitoring">Monitoring środowiska</a>
          <a href="#safety">Bezpieczeństwo (2FA)</a>
        </nav>
      </aside>

      <main className="guide-content">
        <section id="intro" className="guide-section">
          <h1>Witaj w Faraday WMS</h1>
          <p>
            System Faraday to inteligentne narzędzie do zarządzania magazynem z
            automatyczną alokacją towaru i monitoringiem warunków
            przechowywania.
          </p>

          <div className="info-card">
            <Info className="icon" />
            <div>
              <strong>Szybka wskazówka:</strong> System automatycznie dobiera
              miejsce dla towaru na podstawie temperatury i wymiarów. Nie musisz
              robić tego ręcznie!
            </div>
          </div>
        </section>

        <section id="adding" className="guide-section">
          <h2>
            <Package size={24} /> Dodawanie produktów
          </h2>
          <p>Aby dodać nowy produkt do katalogu:</p>
          <ol>
            <li>
              Przejdź do zakładki <strong>Magazyn</strong>.
            </li>
            <li>
              Kliknij przycisk <strong>Dodaj Produkt</strong>.
            </li>
            <li>
              Wypełnij formularz, podając kod kreskowy, wymiary oraz wymagany
              zakres temperatur.
            </li>
          </ol>
          <div className="visual-hint">
            <Search size={16} />{" "}
            <span>
              Pamiętaj: Kod kreskowy musi być unikalny w skali całego systemu.
            </span>
          </div>
        </section>

        <section id="monitoring" className="guide-section">
          <h2>
            <Thermometer size={24} /> Monitoring środowiska
          </h2>
          <p>
            System Faraday w czasie rzeczywistym monitoruje temperaturę i wagę
            na regałach.
          </p>
          <ul>
            <li>
              <span className="dot success"></span> <strong>Zielony:</strong>{" "}
              Parametry w normie.
            </li>
            <li>
              <span className="dot error"></span> <strong>Czerwony:</strong>{" "}
              Przekroczenie limitu (wymagana natychmiastowa interwencja).
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
};

export default UserGuide;

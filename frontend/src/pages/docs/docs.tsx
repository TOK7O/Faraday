import { BookOpen, Info, Package, Thermometer, Search } from "lucide-react";
import { Link } from "react-router-dom";
import "./docs.scss";

const Documentation = () => {
  return (
    <div className="faraday-docs">
      <div className="bg-grid-overlay"></div>

      <header className="docs-nav-top">
        <Link to="/" className="brand-name">
          Faraday<span>Systems</span>
        </Link>
        <Link to="/dashboard" className="btn-dashboard">
          Dashboard
        </Link>
      </header>

      <div className="docs-layout">
        <aside className="docs-sidebar">
          <div className="sidebar-header">
            <BookOpen size={18} />
            <span>User Manual</span>
          </div>
          <nav>
            <a href="#intro" className="active">
              Introduction
            </a>
          </nav>
        </aside>

        <main className="docs-content">
          <section id="intro" className="docs-section">
            <div className="status-pill">v1.0 Guide</div>
            <h1>
              Welcome to <span className="outline-text">Faraday</span> WMS
            </h1>
            <p className="lead-text">
              The Faraday system is an intelligent warehouse management tool
              featuring automated stock allocation and real-time environmental
              monitoring.
            </p>

            <div className="info-card">
              <div className="card-glass-effect"></div>
              <Info className="icon" size={20} />
              <div className="info-text">
                <strong>Quick Tip:</strong> The system automatically selects the
                best storage location based on temperature requirements and
                dimensions. No manual allocation needed.
              </div>
            </div>
          </section>

          <section id="adding" className="docs-section">
            <h2>
              <Package size={22} /> Adding Products
            </h2>
            <div className="step-list">
              <div className="step-item">
                <span className="step-num">01</span>
                <p>
                  Navigate to the <strong>Warehouse</strong> tab in your
                  dashboard.
                </p>
              </div>
              <div className="step-item">
                <span className="step-num">02</span>
                <p>
                  Click the <strong>Add Product</strong> button in the top-right
                  corner.
                </p>
              </div>
              <div className="step-item">
                <span className="step-num">03</span>
                <p>
                  Enter the barcode, dimensions, and specific temperature range
                  requirements.
                </p>
              </div>
            </div>

            <div className="hint-box">
              <Search size={14} />
              <span>
                Note: Each barcode must be unique within the global system
                database.
              </span>
            </div>
          </section>

          <section id="monitoring" className="docs-section">
            <h2>
              <Thermometer size={22} /> Environmental Monitoring
            </h2>
            <p>
              Faraday provides real-time telemetry for shelf temperature and
              weight load.
            </p>
            <div className="indicator-grid">
              <div className="indicator-item">
                <span className="dot success"></span>
                <div className="indicator-desc">
                  <strong>Green:</strong> All parameters are within safe limits.
                </div>
              </div>
              <div className="indicator-item">
                <span className="dot error"></span>
                <div className="indicator-desc">
                  <strong>Red:</strong> Threshold exceeded. Immediate
                  intervention required.
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

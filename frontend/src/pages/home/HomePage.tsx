import { Activity } from "lucide-react";
import { Link } from "react-router-dom";
import "./HomePage.scss";

const HomePage = () => {
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
            <button>Documentation</button>
          </Link>
          <Link to="/dashboard">
            <button>Dashboard</button>
          </Link>
          <Link to="/login">
            <button>Login</button>
          </Link>
        </div>
      </header>

      <main className="hero-creative">
        <div className="hero-main-content">
          <div className="status-pill">
            <span className="pulse"></span> System Operational v1.0
          </div>
          <h1>
            Automated <br />
            <span className="outline-text">Warehouse</span> <br />
            Intelligence
          </h1>
          <p>
            We transform raw sensor data into precision logistics. Faraday is
            more than a WMS – it is the operating system for your warehouse.
          </p>
        </div>

        <div className="hero-widget">
          <div className="glass-card">
            <div className="card-head">
              <Activity size={16} /> <span>Live Environment</span>
            </div>
            <div className="sensor-data">
              <div className="reading">
                <span className="label">Avg. Temp</span>
                <span className="val">4.2°C</span>
              </div>
              <div className="reading">
                <span className="label">Humidity</span>
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

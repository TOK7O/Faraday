import {
  LayoutDashboard,
  Package,
  Users,
  LogOut,
  Bell,
  Search,
  History,
  ShieldCheck,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import "./DashboardPage.scss";
import { useTranslation } from "../../context/LanguageContext";

const DashboardPage = () => {
  const { t } = useTranslation();

  return (
    <div className="dashboard-container">
      <div className="dashboard-grid-bg"></div>

      <aside className="dashboard-sidebar">
        <div className="sidebar-logo">
          <span>
            Faraday<span>Systems</span>
          </span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group">
            <span className="group-label">{t.dashboardPage.sidebar.groups.terminal}</span>
            <a href="#" className="nav-item active">
              <LayoutDashboard size={18} /> {t.dashboardPage.sidebar.nav.overview}
            </a>
            <a href="#" className="nav-item">
              <Package size={18} /> {t.dashboardPage.sidebar.nav.inventory}
            </a>
          </div>

          <div className="nav-group">
            <span className="group-label">{t.dashboardPage.sidebar.groups.securityLogs}</span>
            <a href="#" className="nav-item">
              <Users size={18} /> {t.dashboardPage.sidebar.nav.personnel}
            </a>
            <a href="#" className="nav-item">
              <History size={18} /> {t.dashboardPage.sidebar.nav.operations}
            </a>
            <a href="#" className="nav-item">
              <History size={18} /> {t.dashboardPage.sidebar.nav.reports}
            </a>
          </div>
          <div className="nav-group">
            <span className="group-label">{t.dashboardPage.sidebar.groups.settings}</span>
            <a href="#" className="nav-item">
              <Users size={18} /> {t.dashboardPage.sidebar.nav.theme}
            </a>
            <a href="#" className="nav-item">
              <Users size={18} /> {t.dashboardPage.sidebar.nav.language}
            </a>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn">
            <LogOut size={18} /> {t.dashboardPage.sidebar.logout}
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-navbar">
          <div className="navbar-left">
            <div className="path-display">{t.dashboardPage.navbar.path}</div>
          </div>

          <div className="navbar-actions">
            <div className="search-wrapper">
              <Search size={16} />
              <input type="text" placeholder={t.dashboardPage.navbar.searchPlaceholder} />
            </div>

            <button className="action-btn">
              <Bell size={18} />
              <span className="dot-alert"></span>
            </button>

            <div className="user-tag">
              <span className="role">ADM</span>
              <span className="name">Jan Nowak</span>
            </div>
          </div>
        </header>

        <section className="dashboard-content">
          <div className="bento-dashboard">
            <div className="bento-card large">
              <div className="card-header">
                <Activity size={16} /> {t.dashboardPage.content.realTimeThroughput}
              </div>
              <div className="card-body">
                <h2>
                  142.8 <small>ops/m</small>
                </h2>
                <div className="mini-graph">
                  {[30, 50, 40, 80, 60, 90, 70].map((h, i) => (
                    <div
                      key={i}
                      className="bar"
                      style={{ height: `${h}%` }}
                    ></div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bento-card gray">
              <div className="card-header">{t.dashboardPage.content.warehouseLoad}</div>
              <div className="circle-progress">84%</div>
            </div>

            <div className="bento-card accent">
              <ShieldCheck size={20} />
              <p>{t.dashboardPage.content.securityProtocol}</p>
              <ArrowUpRight size={16} className="corner-icon" />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DashboardPage;

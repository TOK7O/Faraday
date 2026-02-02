import {
  LayoutDashboard,
  Package,
  Users,
  Settings,
  LogOut,
  Bell,
  Search,
  Mail,
  History,
  ShieldCheck,
} from "lucide-react";
import "./DashboardPage.scss";
import * as Separator from "@radix-ui/react-separator";

const DashboardPage = () => {
  return (
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo">
          <span>Faraday</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group">
            <span className="group-label">Główne</span>
            <a href="#" className="nav-item active">
              <LayoutDashboard size={20} /> Dashboard
            </a>
            <a href="#" className="nav-item">
              <Package size={20} /> Magazyn
            </a>
          </div>

          <Separator.Root className="nav-separator" />

          <div className="nav-group">
            <span className="group-label">Administracja</span>
            <a href="#" className="nav-item">
              <Users size={20} /> Zespół
            </a>
            <a href="#" className="nav-item">
              <History size={20} /> Raporty
            </a>
            <a href="#" className="nav-item">
              <ShieldCheck size={20} /> Bezpieczeństwo
            </a>
          </div>

          <Separator.Root className="nav-separator" />

          <div className="nav-group">
            <span className="group-label">System</span>
            <a href="#" className="nav-item">
              <Settings size={20} /> Ustawienia
            </a>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn">
            <LogOut size={20} /> Wyloguj się
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-navbar">
          <div className="navbar-search">
            <Search size={18} />
            <input type="text" placeholder="Szukaj danych..." />
          </div>

          <div className="navbar-actions">
            <button className="icon-badge-btn">
              <Mail size={20} />
            </button>
            <button className="icon-badge-btn">
              <Bell size={20} />
              <span className="badge">3</span>
            </button>
            <div className="user-profile">
              <div className="avatar">JN</div>
              <span className="user-name">Jan Nowak</span>
            </div>
          </div>
        </header>

        <section className="dashboard-content">
          <div className="data-section"></div>
        </section>
      </main>
    </div>
  );
};

export default DashboardPage;

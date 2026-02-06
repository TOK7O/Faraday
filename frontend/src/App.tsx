import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/login/LoginPage";
import RegisterPage from "./pages/register/RegisterPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import Documentation from "./pages/docs/docs";
import HomePage from "./pages/home/HomePage";
import { useTranslation } from "./context/LanguageContext";

function App() {
  const { t } = useTranslation();

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/docs" element={<Documentation />} />
      <Route path="*" element={<div>{t.dashboardPage.content.pageNotFound}</div>} />
    </Routes>
  );
}

export default App;

import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/auth/login/LoginPage";
import RegisterPage from "./pages/auth/register/RegisterPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import Documentation from "./pages/docs/docs";
import HomePage from "./pages/home/HomePage";
import { useTranslation } from "./context/LanguageContext";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const { t } = useTranslation();

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/docs" element={<Documentation />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="*" element={<div>{t.dashboardPage.content.pageNotFound}</div>} />
    </Routes>
  );
}

export default App;

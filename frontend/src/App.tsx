import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/auth/login/LoginPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import HomePage from "./pages/home/HomePage";
import { useTranslation } from "./context/LanguageContext";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const { t } = useTranslation();

  return (
    <div id="faraday-app-container">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="*"
          element={<div>{t.dashboardPage.content.pageNotFound}</div>}
        />
      </Routes>
    </div>
  );
}

export default App;

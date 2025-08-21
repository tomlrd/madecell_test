import { useEffect } from "react";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import ToastSystem from "./components/Toast";
import Dashboard from "./pages/Dashboard";
import LoginForm from "./pages/LoginForm";
import RegisterForm from "./pages/RegisterForm";
import useAuthStore from "./stores/authStore";

function App() {
  const { clearError } = useAuthStore();

  useEffect(() => {
    // Nettoyer les erreurs au démarrage
    clearError();
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Route publique - Login */}
          <Route path="/login" element={<LoginForm />} />

          {/* Route publique - Register */}
          <Route path="/register" element={<RegisterForm />} />

          {/* Route protégée - Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Route par défaut - Redirection */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Route 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Système de toast global */}
        <ToastSystem />
      </div>
    </Router>
  );
}

export default App;

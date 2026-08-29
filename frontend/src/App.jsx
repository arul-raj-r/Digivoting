import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

// Civic Pages
import Register from './pages/Register';
import Login from './pages/auth/Login';
import VerifyEmail from './pages/auth/VerifyEmail';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Default redirects to /register for Module 1 */}
              <Route path="/" element={<Navigate to="/register" replace />} />
              
              {/* Core Active Module 1 & 2 Auth Routes */}
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/verify-email" element={<VerifyEmail />} />

              {/* Catch-all redirect to /register */}
              <Route path="*" element={<Navigate to="/register" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { VoterDashboard } from './pages/VoterDashboard';
import { VotingTerminal } from './pages/VotingTerminal';
import { AdminDashboard } from './pages/AdminDashboard';
import { ResultsDashboard } from './pages/ResultsDashboard';

function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gov-light dark:bg-gov-dark">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gov-blue border-t-transparent dark:border-gov-gold"></div>
      </div>
    );
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Voter Protected Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute allowedRole="VOTER">
                <VoterDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/vote/:id" 
            element={
              <ProtectedRoute allowedRole="VOTER">
                <VotingTerminal />
              </ProtectedRoute>
            } 
          />

          {/* Admin Protected Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRole="ADMIN">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Public Results view */}
          <Route path="/results" element={<ResultsDashboard />} />
          
          {/* Fallback routing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

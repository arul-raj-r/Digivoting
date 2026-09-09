import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

// Layouts & Guards
import PublicLayout from './layouts/PublicLayout';
import AppShell from './layouts/AppShell';
import { ProtectedRoute } from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';
import ElectionCreatorRoute from './components/auth/ElectionCreatorRoute';

// Public Pages
import Home from './pages/public/Home';
import About from './pages/public/About';
import Features from './pages/public/Features';
import HowItWorks from './pages/public/HowItWorks';
import Security from './pages/public/Security';
import Contact from './pages/public/Contact';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOTP from './pages/VerifyOTP';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

import VoterDashboard from './pages/voter/VoterDashboard';
import AvailableElections from './pages/voter/AvailableElections';
import MyElections from './pages/creator/MyElections';
import CreateElectionWizard from './pages/creator/CreateElectionWizard';
import ElectionControlCenter from './pages/creator/ElectionControlCenter';
import VoterParticipationFlow from './pages/voter/VoterParticipationFlow';

import VoterVerificationModule from './pages/modules/VoterVerificationModule';
import ResultsReportModule from './pages/modules/ResultsReportModule';
import SessionsSecurityPage from './pages/security/SessionsSecurityPage';
import AuditLogsPage from './pages/security/AuditLogsPage';
import Settings from './pages/Settings';
import VoterProfile from './pages/voter/VoterProfile';
import HelpSupport from './pages/voter/HelpSupport';
import SecurityDashboard from './pages/admin/SecurityDashboard';

// Results Subpages
import ElectionResultsVoter from './pages/voter/ElectionResultsVoter';

import { setupHttpInterceptors } from './utils/httpInterceptor';

// Helper Redirect Components
function VoteRedirect() {
  const { id } = useParams();
  return <Navigate to={`/elections/${id}/vote`} replace />;
}

function ResultsRedirect() {
  const { id } = useParams();
  return <Navigate to={`/elections/${id}/results`} replace />;
}

export default function App() {
  setupHttpInterceptors();

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <Routes>
              {/* =========================================================
                  1. PUBLIC WEBSITE ROUTES (PublicLayout)
                  ========================================================= */}
              <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
              <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />
              <Route path="/features" element={<PublicLayout><Features /></PublicLayout>} />
              <Route path="/how-it-works" element={<PublicLayout><HowItWorks /></PublicLayout>} />
              <Route path="/security" element={<PublicLayout><Security /></PublicLayout>} />
              <Route path="/contact" element={<PublicLayout><Contact /></PublicLayout>} />

              {/* =========================================================
                  2. AUTHENTICATION FLOW ROUTES
                  ========================================================= */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-otp" element={<VerifyOTP />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/password-reset/request" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/password-reset/confirm" element={<ResetPassword />} />

              {/* =========================================================
                  3. AUTHENTICATED WORKSPACE: OVERVIEW & GENERAL MODULES
                  ========================================================= */}
              {/* Dashboard */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <AppShell>
                    <VoterDashboard />
                  </AppShell>
                </ProtectedRoute>
              } />

              {/* Available Elections Roster & Voting Discovery */}
              <Route path="/available-elections" element={
                <ProtectedRoute>
                  <AppShell>
                    <AvailableElections />
                  </AppShell>
                </ProtectedRoute>
              } />

              {/* Voter Verification Standalone Portal */}
              <Route path="/voter-verification" element={
                <ProtectedRoute>
                  <AppShell>
                    <VoterVerificationModule />
                  </AppShell>
                </ProtectedRoute>
              } />

              {/* Voting Booth & Eligibility Verification Flow */}
              <Route path="/voting" element={
                <ProtectedRoute>
                  <AppShell>
                    <VoterParticipationFlow />
                  </AppShell>
                </ProtectedRoute>
              } />
              <Route path="/elections/:id/vote" element={
                <ProtectedRoute>
                  <AppShell>
                    <VoterParticipationFlow />
                  </AppShell>
                </ProtectedRoute>
              } />
              <Route path="/elections/:id/participate" element={
                <ProtectedRoute>
                  <AppShell>
                    <VoterParticipationFlow />
                  </AppShell>
                </ProtectedRoute>
              } />
              <Route path="/vote/:id" element={<VoteRedirect />} />

              {/* Results & Reports */}
              <Route path="/results" element={
                <ProtectedRoute>
                  <AppShell>
                    <ResultsReportModule />
                  </AppShell>
                </ProtectedRoute>
              } />
              <Route path="/reports" element={<Navigate to="/results" replace />} />
              <Route path="/elections/:id/results" element={
                <ProtectedRoute>
                  <AppShell>
                    <ElectionResultsVoter />
                  </AppShell>
                </ProtectedRoute>
              } />
              <Route path="/results/:id" element={<ResultsRedirect />} />

              {/* Sessions & Security */}
              <Route path="/sessions" element={
                <ProtectedRoute>
                  <AppShell>
                    <SessionsSecurityPage />
                  </AppShell>
                </ProtectedRoute>
              } />

              {/* Settings & Profile */}
              <Route path="/settings" element={
                <ProtectedRoute>
                  <AppShell>
                    <Settings />
                  </AppShell>
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <AppShell>
                    <VoterProfile />
                  </AppShell>
                </ProtectedRoute>
              } />
              <Route path="/help" element={
                <ProtectedRoute>
                  <AppShell>
                    <HelpSupport />
                  </AppShell>
                </ProtectedRoute>
              } />

              {/* =========================================================
                  4. CREATOR WORKSPACE: UNIFIED "MY ELECTIONS" ARCHITECTURE
                  ========================================================= */}
              {/* My Elections Hub (Accessible to all authenticated users) */}
              <Route path="/elections" element={
                <ProtectedRoute>
                  <AppShell>
                    <MyElections />
                  </AppShell>
                </ProtectedRoute>
              } />

              {/* Create Election Wizard (Accessible to all authenticated users) */}
              <Route path="/elections/create" element={
                <ProtectedRoute>
                  <AppShell>
                    <CreateElectionWizard />
                  </AppShell>
                </ProtectedRoute>
              } />

              {/* Single Election Workspace (Control Center) */}
              <Route path="/elections/:id" element={
                <ProtectedRoute>
                  <AppShell>
                    <ElectionControlCenter />
                  </AppShell>
                </ProtectedRoute>
              } />

              {/* Creator Legacy Aliases */}
              <Route path="/creator/elections" element={<Navigate to="/elections" replace />} />
              <Route path="/creator/elections/new" element={<Navigate to="/elections/create" replace />} />
              <Route path="/election-management" element={<Navigate to="/elections" replace />} />

              {/* Audit Logs */}
              <Route path="/audit-logs" element={
                <ProtectedRoute>
                  <AppShell>
                    <AuditLogsPage />
                  </AppShell>
                </ProtectedRoute>
              } />

              {/* Admin Security Dashboard */}
              <Route path="/admin/security" element={
                <ProtectedRoute>
                  <RoleRoute allowedRoles={['ADMIN']}>
                    <AppShell>
                      <SecurityDashboard />
                    </AppShell>
                  </RoleRoute>
                </ProtectedRoute>
              } />

              {/* =========================================================
                  5. CATCH-ALL FALLBACK
                  ========================================================= */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

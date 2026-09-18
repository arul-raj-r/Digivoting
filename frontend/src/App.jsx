import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

// Layouts & Guards
import AppShell from './layouts/AppShell';
import { ProtectedRoute } from './routes/ProtectedRoute';
import RoleRoute from './routes/RoleRoute';
import ElectionCreatorRoute from './components/auth/ElectionCreatorRoute';

// Public Pages (Lazy Loaded)
const Home = lazy(() => import('./pages/public/Home'));
const About = lazy(() => import('./pages/public/About'));
const Features = lazy(() => import('./pages/public/Features'));
const HowItWorks = lazy(() => import('./pages/public/HowItWorks'));
const Security = lazy(() => import('./pages/public/Security'));
const Contact = lazy(() => import('./pages/public/Contact'));

// Auth Pages (Lazy Loaded)
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const VerifyOTP = lazy(() => import('./pages/VerifyOTP'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const ElectionEntryPage = lazy(() => import('./pages/elections/ElectionEntryPage'));

// Voter & Creator Core Workspace (Lazy Loaded)
const VoterDashboard = lazy(() => import('./pages/voter/VoterDashboard'));
const AvailableElections = lazy(() => import('./pages/voter/AvailableElections'));
const MyElections = lazy(() => import('./pages/creator/MyElections'));
const CreateElectionWizard = lazy(() => import('./pages/creator/CreateElectionWizard'));
const ElectionControlCenter = lazy(() => import('./pages/creator/ElectionControlCenter'));
const VoterParticipationFlow = lazy(() => import('./pages/voter/VoterParticipationFlow'));
const VotingBooth = lazy(() => import('./pages/voter/VotingBooth'));
const VotingHistory = lazy(() => import('./pages/voter/VotingHistory'));

// Specialized & Heavy Feature Modules (Lazy Loaded)
const VoterVerificationModule = lazy(() => import('./pages/modules/VoterVerificationModule'));
const ResultsReportModule = lazy(() => import('./pages/modules/ResultsReportModule'));
const SessionsSecurityPage = lazy(() => import('./pages/security/SessionsSecurityPage'));
const AuditLogsPage = lazy(() => import('./pages/security/AuditLogsPage'));
const Settings = lazy(() => import('./pages/Settings'));
const VoterProfile = lazy(() => import('./pages/voter/VoterProfile'));
const HelpSupport = lazy(() => import('./pages/voter/HelpSupport'));
const SecurityDashboard = lazy(() => import('./pages/admin/SecurityDashboard'));

// Results Subpages & AI Assistant (Lazy Loaded)
const ElectionResultsVoter = lazy(() => import('./pages/voter/ElectionResultsVoter'));
const AIAssistant = lazy(() => import('./pages/AIAssistant'));
const NotFound = lazy(() => import('./pages/NotFound'));

import { setupHttpInterceptors } from './utils/httpInterceptor';

// Institutional loading fallback skeleton
function PageLoadingFallback() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 select-none">
      <div className="relative flex items-center justify-center">
        <div className="w-9 h-9 border-2 border-stone-200 dark:border-stone-800 border-t-forest-600 dark:border-t-forest-400 rounded-full animate-spin" />
      </div>
      <span className="mt-3 text-xs font-mono text-stone-500 dark:text-stone-400">Loading module...</span>
    </div>
  );
}

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
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
              {/* =========================================================
                  1. PUBLIC WEBSITE ROUTES
                  ========================================================= */}
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/features" element={<Features />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/security" element={<Security />} />
              <Route path="/contact" element={<Contact />} />

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

              {/* Public / Hybrid Election Entry (Direct Link & QR Code Destination) */}
              <Route path="/election/:id" element={<ElectionEntryPage />} />
              <Route path="/elections/:id/enter" element={<ElectionEntryPage />} />

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

              {/* DigiVote Civic AI Assistant */}
              <Route path="/ai-assistant" element={
                <ProtectedRoute>
                  <AppShell>
                    <AIAssistant />
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

              {/* Voting Flow: Eligibility & Identity Verification */}
              <Route path="/voting" element={
                <ProtectedRoute>
                  <AppShell>
                    <VoterParticipationFlow />
                  </AppShell>
                </ProtectedRoute>
              } />
              <Route path="/elections/:id/verify" element={
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

              {/* Polling Booth: Candidate Selection & Ballot Submission */}
              <Route path="/elections/:id/vote" element={
                <ProtectedRoute>
                  <AppShell>
                    <VotingBooth />
                  </AppShell>
                </ProtectedRoute>
              } />
              <Route path="/vote/:id" element={<VoteRedirect />} />
              <Route path="/voting-history" element={
                <ProtectedRoute>
                  <AppShell>
                    <VotingHistory />
                  </AppShell>
                </ProtectedRoute>
              } />

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

              {/* Access Restricted 403 */}
              <Route path="/403" element={
                <NotFound 
                  code="403" 
                  title="Access Restricted" 
                  message="You do not have administrative clearance to access this area. Your session and credentials remain secure." 
                />
              } />

              {/* =========================================================
                  5. CATCH-ALL 404 FALLBACK
                  ========================================================= */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </Router>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

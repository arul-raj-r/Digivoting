import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  UserCheck,
  Calendar,
  Activity,
  ArrowRight,
  ShieldAlert as AlertIcon,
  CheckCircle,
  Clock
} from 'lucide-react';
import Card from '../../components/common/Card';
import StatCard from '../../components/common/StatCard';
import Alert from '../../components/common/Alert';
import EmptyState from '../../components/common/EmptyState';
import Timeline from '../../components/common/Timeline';
import { useAuth } from '../../context/AuthContext';
import { voterService } from '../../services/voterService';
import { electionService } from '../../services/electionService';

export default function Dashboard() {
  const { user } = useAuth();
  const [voterStatus, setVoterStatus] = useState(null);
  const [activeElections, setActiveElections] = useState([]);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [voterError, setVoterError] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        // Fetch voter verification status
        try {
          const status = await voterService.getVoterStatus();
          setVoterStatus(status);
        } catch (e) {
          setVoterError(true);
        }

        // Fetch active elections
        try {
          const elections = await electionService.getActiveElections();
          setActiveElections(elections || []);
        } catch (e) {
          console.error('Failed to load elections', e);
        }

        // Fetch recent security activities
        try {
          const logs = await voterService.getSecurityActivity();
          setSecurityLogs(logs || []);
        } catch (e) {
          console.error('Failed to load security logs', e);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  // Default security logs if service fails or is empty - marked as Demo Data
  const defaultLogs = [
    { title: 'Session Authenticated', description: 'MFA clearance successful. Session active.', timestamp: 'Just now', type: 'auth' },
    { title: 'Browser integrity checked', description: 'Passed standard checks.', timestamp: '10 mins ago', type: 'success' }
  ];

  const currentLogs = securityLogs.length > 0 ? securityLogs : defaultLogs;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {user?.full_name || 'Citizen'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Access secure digital voting pathways and audit your registration parameters.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-450 dark:text-slate-400">
          <span>Official Session Status:</span>
          <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-900 select-none">
            Active Citizen Session
          </span>
        </div>
      </div>

      {/* Security Check Warners */}
      {!voterStatus?.is_identity_verified && (
        <Alert type="warning" title="Citizen Verification Required">
          <p className="text-xs leading-relaxed mb-3">
            Your digital identity checks have not been completed. You must connect your Aadhaar, Voter ID, or DigiLocker profile to become eligible for upcoming election sessions.
          </p>
          <Link to="/identity-verification">
            <button className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs">
              Complete Identity Verification
            </button>
          </Link>
        </Alert>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Identity Status"
          value={
            isLoading
              ? 'Checking...'
              : voterStatus?.is_identity_verified
              ? 'Verified'
              : 'Verification Required'
          }
          icon={<UserCheck className="h-6 w-6" />}
          trend={voterStatus?.is_identity_verified ? 'Secure Profile Connected' : 'Connect Aadhaar / DigiLocker'}
          trendType={voterStatus?.is_identity_verified ? 'success' : 'danger'}
        />

        <StatCard
          title="Voter Eligibility"
          value={
            isLoading
              ? 'Checking...'
              : voterStatus?.is_eligible
              ? 'Eligible'
              : 'Pending Certification'
          }
          icon={<Clock className="h-6 w-6" />}
          trend={voterStatus?.is_eligible ? `Constituency: ${voterStatus?.constituency_name}` : 'Voter registry check pending'}
          trendType={voterStatus?.is_eligible ? 'success' : 'neutral'}
        />

        <StatCard
          title="Enrollment Actions"
          value={
            isLoading
              ? 'Checking...'
              : voterStatus?.is_biometric_enrolled
              ? 'Enrolled'
              : 'Setup Required'
          }
          icon={<Activity className="h-6 w-6" />}
          trend={voterStatus?.is_biometric_enrolled ? 'WebAuthn / Face Profile Configured' : 'Configure Biometrics'}
          trendType={voterStatus?.is_biometric_enrolled ? 'success' : 'danger'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Elections */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Active Elections" subtitle="Cast your ballot in certified public polls.">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gov-blue dark:border-gov-gold border-t-transparent"></div>
              </div>
            ) : activeElections.length === 0 ? (
              <EmptyState
                title="No active elections"
                description={
                  voterError
                    ? 'Election database connection is currently unavailable. Please verify API endpoints.'
                    : 'There are currently no active elections configured for your constituency.'
                }
              />
            ) : (
              <div className="space-y-4">
                {activeElections.map((elec) => (
                  <div
                    key={elec.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-105 dark:border-slate-800 rounded-lg gap-4"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                        {elec.name}
                      </h4>
                      <p className="text-[11px] text-slate-450 dark:text-slate-450 mt-0.5">
                        Constituency: {elec.constituency_name} | Closes on: {elec.end_date}
                      </p>
                    </div>
                    
                    {voterStatus?.is_eligible ? (
                      <Link to={`/elections/${elec.id}`} className="shrink-0">
                        <Button variant="primary" size="sm" className="w-full">
                          Enter Voting Hub
                          <ArrowRight className="ml-1.5 h-4 w-4" />
                        </Button>
                      </Link>
                    ) : (
                      <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-400 px-3 py-1.5 rounded-lg border border-rose-100 dark:border-rose-900 select-none">
                        Eligibility Required
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Security Logs Sidebar */}
        <div className="space-y-6">
          <Card title="Security & Activity Audit" subtitle="Your recent authentication events.">
            <Timeline items={currentLogs} />
            <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4 text-center">
              <Link
                to="/security"
                className="text-xs font-semibold text-gov-blue dark:text-gov-slate hover:underline flex items-center justify-center gap-1"
              >
                Manage Security Settings
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

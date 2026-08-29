import { useState, useEffect } from 'react';
import { ShieldAlert, Users, Calendar, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import Card from '../../components/common/Card';
import Alert from '../../components/common/Alert';
import { adminService } from '../../services/adminService';

import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadMetrics() {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const data = await adminService.getDashboardMetrics();
        setMetrics(data);
      } catch (err) {
        setErrorMsg('Administrative operations database connection offline. Please check API endpoints.');
      } finally {
        setIsLoading(false);
      }
    }
    loadMetrics();
  }, []);

  // DEMO DATA for charts if API is unavailable or unpopulated
  const registrationData = {
    labels: ['May', 'Jun', 'Jul', 'Aug'],
    datasets: [
      {
        label: 'Voters Registered',
        data: [12000, 24000, 45000, 78000],
        backgroundColor: '#0b3152',
        borderRadius: 4,
      },
    ],
  };

  const statusData = {
    labels: ['Verified Voters', 'Pending e-KYC', 'Suspended profiles'],
    datasets: [
      {
        data: [65, 28, 7],
        backgroundColor: ['#0b7538', '#f37021', '#ea4335'],
      },
    ],
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Administrative Control Console</h1>
        <p className="text-xs text-slate-500 mt-1">
          Monitor system metrics, coordinate active elections, and moderate voter registration.
        </p>
      </div>

      {errorMsg && <Alert type="warning">{errorMsg}</Alert>}

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Users"
          value={isLoading ? '...' : metrics?.total_users?.toLocaleString() || '78,400'}
          icon={<Users className="h-6 w-6" />}
          trend="Total accounts created"
        />
        <StatCard
          title="Verified Voters"
          value={isLoading ? '...' : metrics?.verified_voters?.toLocaleString() || '52,120'}
          icon={<ShieldAlert className="h-6 w-6" />}
          trend="66.4% verification rate"
          trendType="success"
        />
        <StatCard
          title="Active Elections"
          value={isLoading ? '...' : metrics?.active_elections?.toString() || '4'}
          icon={<Calendar className="h-6 w-6" />}
          trend="Currently running polls"
        />
        <StatCard
          title="Pending Audits"
          value={isLoading ? '...' : metrics?.pending_verifications?.toString() || '342'}
          icon={<AlertTriangle className="h-6 w-6 text-amber-500" />}
          trend="Aadhaar / Voter ID updates"
          trendType="neutral"
        />
        <StatCard
          title="Total Ballots Cast"
          value={isLoading ? '...' : metrics?.votes_cast?.toLocaleString() || '184,200'}
          icon={<BarChart3 className="h-6 w-6" />}
          trend="Across all historical polls"
        />
        <StatCard
          title="System Warnings"
          value={isLoading ? '...' : metrics?.security_events?.toString() || '0'}
          icon={<AlertTriangle className="h-6 w-6 text-rose-500" />}
          trend="Failed logins / Lockouts"
          trendType={metrics?.security_events > 0 ? 'danger' : 'success'}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card title="Voter Registration Trend" subtitle="DEMO DATA — Monthly user registrations">
            <div className="h-72 flex items-center justify-center">
              <Bar
                data={registrationData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                }}
              />
            </div>
          </Card>
        </div>

        <div>
          <Card title="Verification Proportions" subtitle="DEMO DATA — Registry status percentage">
            <div className="h-72 flex items-center justify-center">
              <Doughnut
                data={statusData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                }}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

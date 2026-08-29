import { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, UserX, Ban } from 'lucide-react';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Alert from '../../components/common/Alert';
import { adminService } from '../../services/adminService';

export default function AdminSecurity() {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadAlerts() {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const data = await adminService.getSecurityAlerts();
        // Expected alerts format: [{ id, timestamp, alert_type, description, ip_address, count }, ...]
        setAlerts(data || []);
      } catch (e) {
        setErrorMsg('Security operations center logs offline.');
      } finally {
        setIsLoading(false);
      }
    }
    loadAlerts();
  }, []);

  const headers = ['Timestamp', 'Threat Alert Type', 'Description', 'Origin IP / Device', 'Failure Count'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-rose-600 dark:text-rose-500">Security Operations Monitor</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review real-time failed authentications, session timeouts, and lockout actions.
        </p>
      </div>

      {errorMsg && <Alert type="warning">{errorMsg}</Alert>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Session Failures Status" className="border-rose-100 dark:border-rose-900">
          <div className="flex items-center gap-3">
            <UserX className="h-8 w-8 text-rose-500 shrink-0" />
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lockouts Active</span>
              <p className="text-xl font-extrabold">2 Accounts Locked</p>
            </div>
          </div>
        </Card>
        <Card title="OTP Failure Logs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-amber-500 shrink-0" />
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">OTP Resends Requested</span>
              <p className="text-xl font-extrabold">14 Requests (24h)</p>
            </div>
          </div>
        </Card>
        <Card title="Brute Force Checks">
          <div className="flex items-center gap-3">
            <Ban className="h-8 w-8 text-slate-500 shrink-0" />
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Blacklisted IPs</span>
              <p className="text-xl font-extrabold">0 IPs Blocked</p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Recent Threat Logs">
        <Table
          headers={headers}
          data={alerts}
          isLoading={isLoading}
          renderRow={(alert) => (
            <tr key={alert.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-805/30 transition-colors text-xs">
              <td className="px-6 py-4 whitespace-nowrap text-slate-450">{alert.timestamp}</td>
              <td className="px-6 py-4">
                <span className="font-bold text-rose-600 dark:text-rose-455">
                  {alert.alert_type}
                </span>
              </td>
              <td className="px-6 py-4 text-slate-750 dark:text-slate-300 leading-normal">{alert.description}</td>
              <td className="px-6 py-4 font-mono">{alert.ip_address}</td>
              <td className="px-6 py-4 font-semibold text-center">{alert.count}</td>
            </tr>
          )}
        />
      </Card>
    </div>
  );
}

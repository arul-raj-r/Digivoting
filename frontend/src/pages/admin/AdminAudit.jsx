import { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Table from '../../components/common/Table';
import Select from '../../components/forms/Select';
import SearchBar from '../../components/common/SearchBar';
import Alert from '../../components/common/Alert';
import { adminService } from '../../services/adminService';

export default function AdminAudit() {
  const [logs, setLogs] = useState([]);
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadLogs() {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const data = await adminService.getAuditLogs();
        // Expected data format: [{ id, timestamp, event, user_email, severity, result }, ...]
        setLogs(data || []);
      } catch (e) {
        setErrorMsg('Audit trail service is offline.');
      } finally {
        setIsLoading(false);
      }
    }
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSeverity = severityFilter ? log.severity === severityFilter : true;
    const matchesUser = searchUser
      ? log.user_email?.toLowerCase().includes(searchUser.toLowerCase()) ||
        log.event?.toLowerCase().includes(searchUser.toLowerCase())
      : true;
    return matchesSeverity && matchesUser;
  });

  const headers = ['Timestamp', 'System Event', 'Actor User', 'Severity', 'Outcome'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">System Audit logs</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review immutable platform event registers, database writes, and operations configurations.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <SearchBar
          value={searchUser}
          onChange={setSearchUser}
          onClear={() => setSearchUser('')}
          placeholder="Filter by event or email actor..."
          className="max-w-md"
        />

        <Select
          id="severitySelect"
          placeholder="All Severities"
          options={[
            { label: 'All Severities', value: '' },
            { label: 'Info', value: 'INFO' },
            { label: 'Warning', value: 'WARNING' },
            { label: 'Critical', value: 'CRITICAL' },
          ]}
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="w-full sm:w-48"
        />
      </div>

      {errorMsg && <Alert type="warning">{errorMsg}</Alert>}

      <Table
        headers={headers}
        data={filteredLogs}
        isLoading={isLoading}
        renderRow={(log) => (
          <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-805/30 transition-colors text-xs">
            <td className="px-6 py-4 whitespace-nowrap text-slate-450">{log.timestamp}</td>
            <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200">{log.event}</td>
            <td className="px-6 py-4 font-mono">{log.user_email || 'SYSTEM_DAEMON'}</td>
            <td className="px-6 py-4">
              <span
                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                  log.severity === 'CRITICAL'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                    : log.severity === 'WARNING'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400'
                }`}
              >
                {log.severity}
              </span>
            </td>
            <td className="px-6 py-4">
              <span className="font-semibold text-slate-650 dark:text-slate-350">{log.result}</span>
            </td>
          </tr>
        )}
      />
    </div>
  );
}

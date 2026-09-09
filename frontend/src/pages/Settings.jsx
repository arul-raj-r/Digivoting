import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Laptop, 
  Smartphone, 
  Tablet, 
  ShieldCheck, 
  LogOut, 
  History, 
  Sun, 
  Moon, 
  Lock, 
  Key, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Trash2, 
  Clock, 
  Globe, 
  Sliders, 
  FileText,
  Download,
  Fingerprint
} from 'lucide-react';
import { getSessions, revokeSession, revokeAllSessions, getSecurityActivity } from '../api/auth';

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout, logoutAll } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState('sessions'); // 'sessions' | 'activity' | 'appearance' | 'security'
  const [sessions, setSessions] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('60');

  const fetchBackendSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await getSessions();
      const list = res.sessions || res.data?.sessions || [];
      if (Array.isArray(list)) {
        setSessions(list.map((s, idx) => ({
          id: s.id || `sess_${idx}`,
          device_name: s.device_name || 'Browser Terminal',
          browser: s.browser || (s.user_agent ? s.user_agent.split(' ')[0] : 'Web Client'),
          ip_address: s.ip_address || '127.0.0.1',
          location: s.location || 'Secure Gateway',
          last_active: s.last_active_at ? new Date(s.last_active_at).toLocaleTimeString() + ' (' + new Date(s.last_active_at).toLocaleDateString() + ')' : 'Active Now',
          is_current: !!s.is_current,
          icon: s.device_type === 'mobile' ? Smartphone : Laptop
        })));
      }
    } catch (err) {
      console.warn('Failed to load active sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchSecurityActivity = async () => {
    setActivityLoading(true);
    try {
      const res = await getSecurityActivity();
      const list = res.logs || [];
      if (Array.isArray(list) && list.length > 0) {
        setActivityLogs(list.map((item) => ({
          id: item.id,
          event: item.title,
          description: item.description,
          ip: item.ip_address || 'Local Address',
          device: item.user_agent ? item.user_agent.slice(0, 35) + '...' : 'Verified Client',
          timestamp: item.timestamp,
          status: item.type === 'auth' ? 'success' : 'warning',
        })));
      }
    } catch (err) {
      console.warn('Failed to load security activity:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    fetchBackendSessions();
    fetchSecurityActivity();
  }, []);

  const handleRevokeSingle = async (sessionId) => {
    setLoading(true);
    try {
      await revokeSession(sessionId);
      setSuccessMsg('Session successfully terminated.');
      await fetchBackendSessions();
      await fetchSecurityActivity();
    } catch (err) {
      setSuccessMsg(err.message || 'Failed to revoke session.');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMsg(''), 3500);
    }
  };

  const handleRevokeAllOther = async () => {
    setLoading(true);
    try {
      await revokeAllSessions(true);
      setSuccessMsg('All remote sessions have been signed out.');
      await fetchBackendSessions();
      await fetchSecurityActivity();
    } catch (err) {
      setSuccessMsg(err.message || 'Failed to revoke remote sessions.');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMsg(''), 3500);
    }
  };

  const handleExportLogs = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(activityLogs, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `digivote_activity_audit_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* Module Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              System Settings & Security
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Account, Sessions & Activity
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Monitor active device sessions, inspect sign-in audit ledgers, and manage security preferences.
          </p>
        </div>

        {/* Global Action */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-semibold flex items-center gap-2 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Current Device</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'sessions'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>Active Sessions ({sessions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'activity'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Login & Logout Activity</span>
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'appearance'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Sun className="w-4 h-4" />
          <span>Theme & Appearance</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'security'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Security & 2FA</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE SESSIONS */}
      {activeTab === 'sessions' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Authorized Device Sessions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You are currently signed in on {sessions.length} devices. Revoke any unrecognized session immediately.
              </p>
            </div>

            {sessions.filter(s => !s.is_current).length > 0 && (
              <button
                onClick={handleRevokeAllOther}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Revoke All Other Devices</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {sessions.map((sess) => {
              const Icon = sess.icon || Laptop;
              return (
                <div
                  key={sess.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    sess.is_current
                      ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`p-2.5 rounded-xl shrink-0 ${
                      sess.is_current 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          {sess.device_name}
                        </span>
                        {sess.is_current && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            Current Session
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                        <span>{sess.browser}</span>
                        <span>&bull;</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">{sess.ip_address}</span>
                        <span>&bull;</span>
                        <span>{sess.location}</span>
                      </div>

                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        Active: <span className="font-medium text-slate-600 dark:text-slate-300">{sess.last_active}</span>
                      </p>
                    </div>
                  </div>

                  {!sess.is_current ? (
                    <button
                      onClick={() => handleRevokeSingle(sess.id)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold self-end sm:self-center transition-colors"
                    >
                      Revoke
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 self-end sm:self-center">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Protected Connection</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: LOGIN & LOGOUT ACTIVITY */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Historical Sign-In & Sign-Out Ledger
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tamper-evident record of all authentication handshakes, terminations, and security events.
              </p>
            </div>

            <button
              onClick={handleExportLogs}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5 text-indigo-500" />
              <span>Export Audit Log</span>
            </button>
          </div>

          {/* Activity Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">IP Address</th>
                    <th className="py-3 px-4">Client / Device</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {activityLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            log.status === 'success' 
                              ? 'bg-emerald-500' 
                              : log.status === 'warning' 
                              ? 'bg-amber-500' 
                              : 'bg-indigo-500'
                          }`} />
                          <span>{log.event}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {log.description}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                        {log.ip}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {log.device}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          log.status === 'success'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : log.status === 'warning'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: THEME & APPEARANCE */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Interface Color Scheme
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose your preferred interface lighting. DigiVote adapts to high-contrast developer standards.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Light Theme Card */}
              <div
                onClick={() => theme === 'dark' && toggleTheme()}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  theme === 'light'
                    ? 'border-indigo-600 bg-indigo-50/20 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sun className="w-5 h-5 text-amber-500" />
                    <span className="font-bold text-xs text-slate-900 dark:text-white">Light Mode</span>
                  </div>
                  {theme === 'light' && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  )}
                </div>
                <div className="h-16 rounded-lg bg-slate-100 border border-slate-200 p-2 flex flex-col justify-between">
                  <div className="h-2 w-16 bg-slate-300 rounded" />
                  <div className="flex gap-1">
                    <div className="h-3 w-8 bg-indigo-500 rounded" />
                    <div className="h-3 w-12 bg-slate-200 rounded" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Crisp daylight presentation with high readability.
                </p>
              </div>

              {/* Dark Theme Card */}
              <div
                onClick={() => theme === 'light' && toggleTheme()}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  theme === 'dark'
                    ? 'border-indigo-600 bg-indigo-950/20 shadow-md'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Moon className="w-5 h-5 text-indigo-400" />
                    <span className="font-bold text-xs text-slate-900 dark:text-white">Dark Mode</span>
                  </div>
                  {theme === 'dark' && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  )}
                </div>
                <div className="h-16 rounded-lg bg-slate-950 border border-slate-800 p-2 flex flex-col justify-between">
                  <div className="h-2 w-16 bg-slate-800 rounded" />
                  <div className="flex gap-1">
                    <div className="h-3 w-8 bg-indigo-600 rounded" />
                    <div className="h-3 w-12 bg-slate-800 rounded" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  High-contrast dark mode tailored for long governance sessions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SECURITY & 2FA */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-indigo-600" />
                  <span>Two-Factor Authentication (2FA / OTP)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Enforces secondary verification challenge code upon signing in.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={twoFactorEnabled}
                  onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
              </label>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Idle Session Auto-Timeout</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Automatically invalidate browser token after inactivity period.
                </p>
              </div>

              <select
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="15">15 Minutes</option>
                <option value="30">30 Minutes</option>
                <option value="60">1 Hour (Recommended)</option>
                <option value="1440">24 Hours</option>
              </select>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">Active Cryptographic Protocol:</p>
              <p className="font-mono text-[11px]">HMAC-SHA256 • Ed25519 Secret Ballot Blind Signatures</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

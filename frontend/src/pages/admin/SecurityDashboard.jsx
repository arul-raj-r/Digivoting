import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, RefreshCw, KeyRound, AlertCircle, CheckCircle2, Search, Filter, Lock, Unlock, Phone, ArrowLeft, Loader2, UserCheck, Shield } from 'lucide-react';
import { getSecurityEvents, unlockUser } from '../../api/admin';

export default function SecurityDashboard() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    locked_accounts_24h: 0,
    ip_throttles_24h: 0,
    suspicious_patterns_7d: 0,
    total_locked_users: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [emailQuery, setEmailQuery] = useState('');

  // Unlock Modal State
  const [unlockTargetId, setUnlockTargetId] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  const fetchAuditData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const params = {};
      if (eventTypeFilter) params.event_type = eventTypeFilter;
      if (emailQuery.trim()) params.email = emailQuery.trim();

      const res = await getSecurityEvents(params);
      setEvents(res.events || []);
      if (res.stats) setStats(res.stats);
    } catch (err) {
      if (err.status === 403) {
        setErrorMsg('Access denied. Administrative credentials required to view the sovereign security console.');
      } else if (err.status === 401) {
        navigate('/login', { replace: true });
      } else {
        setErrorMsg(err.message || 'Failed to load security audit data.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [eventTypeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAuditData();
  };

  const handleManualUnlockSubmit = async (e) => {
    e.preventDefault();
    if (!unlockTargetId.trim()) return;

    setIsUnlocking(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await unlockUser(unlockTargetId.trim());
      setSuccessMsg(res.message || 'Account successfully unlocked.');
      setUnlockTargetId('');
      await fetchAuditData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setErrorMsg(err.message || 'Could not unlock user.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const getEventBadge = (type) => {
    switch (type) {
      case 'account_locked':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 uppercase">Account Locked</span>;
      case 'account_auto_unlocked':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase">Auto Unlocked</span>;
      case 'manual_unlock':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">Manual Admin Unlock</span>;
      case 'suspicious_pattern':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase">Credential Stuffing Flag</span>;
      case 'ip_throttled':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 uppercase">IP Throttled</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 uppercase">{type}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f9] text-slate-800 flex flex-col font-sans">
      
      {/* 1. TOP NATIONAL STRIP */}
      <div className="w-full h-1.5 bg-gradient-to-r from-[#f47c20] via-white to-[#11783e]" />
      
      {/* 2. ECI OFFICIAL HEADER BAR */}
      <header className="w-full bg-[#0d2847] text-white shadow-md border-b border-[#183e68]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shadow-inner">
              <svg className="w-7 h-7 fill-current text-amber-300" viewBox="0 0 24 24">
                <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4zm0 3.18l6 3v4.82c0 4.38-2.92 8.48-6 9.6-3.08-1.12-6-5.22-6-9.6V8.18l6-3zM11 7h2v6h-2zm0 8h2v2h-2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-bold tracking-tight font-serif text-white">
                  भारत निर्वाचन आयोग
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-red-500/20 text-red-300 border border-red-400/30 rounded uppercase tracking-wide">
                  ADMIN DEFENSE CONSOLE
                </span>
              </div>
              <p className="text-xs text-slate-200 font-medium tracking-wide">
                Election Commission of India — Sovereign Security Governance & Lockout Operations (Module 7)
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3 text-xs">
            <Link
              to="/sessions"
              className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
            >
              My Sessions
            </Link>
          </div>
        </div>
      </header>

      {/* 3. SUB HEADER */}
      <div className="w-full bg-[#183e68] text-white text-xs py-1.5 px-4 sm:px-8 border-b border-[#0d2847]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-amber-300">Security Gate:</span>
            <span>Rolling Lockout Enforcement &bull; Threat Heuristics &bull; Audit Trail</span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-slate-300">
            <span>Algorithm: Argon2id Password Hasher Active</span>
          </div>
        </div>
      </div>

      {/* 4. MAIN DASHBOARD CONTENT */}
      <main className="max-w-7xl w-full mx-auto my-8 px-4 sm:px-6 lg:px-8 flex-grow space-y-6">
        
        {/* Feedback Alerts */}
        {successMsg && (
          <div role="status" className="p-3.5 bg-emerald-50 border-l-4 border-emerald-600 text-emerald-900 text-xs rounded-r flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div role="alert" className="p-3.5 bg-red-50 border-l-4 border-red-600 text-red-800 text-xs rounded-r flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white p-5 rounded-lg border border-[#d4e0eb] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wide">Locked Accounts (24h)</span>
              <Lock className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.locked_accounts_24h}</div>
            <p className="text-[11px] text-slate-500">Triggered by 5 failures in 15 mins</p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-[#d4e0eb] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wide">Currently Locked Users</span>
              <ShieldAlert className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-900">{stats.total_locked_users}</div>
            <p className="text-[11px] text-slate-500">Require 30m auto-wait or manual unlock</p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-[#d4e0eb] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wide">IP Throttles (24h)</span>
              <Shield className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.ip_throttles_24h}</div>
            <p className="text-[11px] text-slate-500">Protected against network flooding</p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-[#d4e0eb] shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wide">Suspicious Patterns (7d)</span>
              <AlertCircle className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.suspicious_patterns_7d}</div>
            <p className="text-[11px] text-slate-500">Credential stuffing signatures</p>
          </div>

        </div>

        {/* ACTION TOOLBAR: SEARCH & UNLOCK TOOL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Quick Manual Unlock Tool */}
          <div className="bg-white p-5 rounded-lg border border-[#d4e0eb] shadow-xs space-y-3 lg:col-span-1">
            <div className="flex items-center gap-2">
              <Unlock className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-[#0d2847] uppercase tracking-wide">Manual Account Unlock</h3>
            </div>
            <p className="text-xs text-slate-500">
              Enter citizen User UUID to immediately lift temporary lockout and restore active voting status.
            </p>
            <form onSubmit={handleManualUnlockSubmit} className="space-y-2">
              <input
                type="text"
                placeholder="User UUID (e.g. 550e8400-e29b...)"
                value={unlockTargetId}
                onChange={(e) => setUnlockTargetId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 text-slate-900 border border-slate-300 rounded focus:bg-white focus:outline-none focus:border-[#0d2847]"
              />
              <button
                type="submit"
                disabled={isUnlocking || !unlockTargetId.trim()}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
              >
                {isUnlocking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                <span>Authorize Account Unlock</span>
              </button>
            </form>
          </div>

          {/* Audit Search & Filter Bar */}
          <div className="bg-white p-5 rounded-lg border border-[#d4e0eb] shadow-xs space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#0d2847]" />
                <h3 className="text-sm font-bold text-[#0d2847] uppercase tracking-wide">Filter Security Audit Logs</h3>
              </div>
              <button
                onClick={fetchAuditData}
                disabled={isLoading}
                className="p-1.5 rounded hover:bg-slate-100 text-slate-600 text-xs flex items-center gap-1 font-semibold"
                title="Refresh log registry"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Event Type</label>
                <select
                  value={eventTypeFilter}
                  onChange={(e) => setEventTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded focus:outline-none focus:border-[#0d2847]"
                >
                  <option value="">All Security Events</option>
                  <option value="account_locked">Account Locked (5 fails / 15m)</option>
                  <option value="account_auto_unlocked">Account Auto Unlocked</option>
                  <option value="manual_unlock">Manual Admin Unlock</option>
                  <option value="suspicious_pattern">Suspicious Pattern / Stuffing</option>
                  <option value="ip_throttled">IP Throttled</option>
                </select>
              </div>

              <form onSubmit={handleSearchSubmit}>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Search Citizen Email</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="voter@gov.in..."
                    value={emailQuery}
                    onChange={(e) => setEmailQuery(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white text-slate-900 border border-slate-300 rounded focus:outline-none focus:border-[#0d2847]"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-[#0d2847] text-white rounded font-bold text-xs flex items-center gap-1 hover:bg-[#07192d]"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div>

        {/* SECURITY AUDIT EVENT TABLE */}
        <div className="bg-white rounded-lg border border-[#d4e0eb] shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800">
              Security Event Audit Registry ({events.length})
            </h4>
            <span className="text-[11px] text-slate-500">Showing last 100 entries</span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#0d2847] mx-auto" />
              <p className="text-xs text-slate-500 font-semibold">Querying Security Events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No matching security audit events found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Citizen Account</th>
                    <th className="py-3 px-4">Origin IP</th>
                    <th className="py-3 px-4">Details / Metadata</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {events.map((evt) => (
                    <tr key={evt.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold">
                        {getEventBadge(evt.event_type)}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {evt.user_email}
                        {evt.user && (
                          <span className="block text-[10px] font-mono text-slate-400">ID: {evt.user}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {evt.ip_address || "—"}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600 max-w-xs truncate">
                        {JSON.stringify(evt.metadata)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500 whitespace-nowrap">
                        {new Date(evt.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* 5. FOOTER */}
      <footer className="w-full bg-[#0d2847] text-white border-t-4 border-[#f47c20] py-4 text-center text-xs">
        <p className="text-slate-300 text-[11px]">
          &copy; {new Date().getFullYear()} Election Commission of India &bull; DigiVote Sovereign Digital Democracy Network
        </p>
      </footer>
    </div>
  );
}

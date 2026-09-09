import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Laptop, 
  Smartphone, 
  Clock, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  LogOut,
  Terminal,
  Shield
} from 'lucide-react';
import { getSessions, revokeSession, revokeAllSessions, getSecurityActivity } from '../../api/auth';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';

export default function SessionsSecurityPage() {
  const [sessions, setSessions] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [sessionsData, activityData] = await Promise.all([
        getSessions().catch(() => ({ sessions: [] })),
        getSecurityActivity().catch(() => ({ events: [] }))
      ]);

      const sessList = Array.isArray(sessionsData) ? sessionsData : (sessionsData.sessions || []);
      const actList = Array.isArray(activityData) ? activityData : (activityData.events || activityData.results || []);

      setSessions(sessList);
      setSecurityEvents(actList);
    } catch (err) {
      setError(err.message || 'Unable to fetch security sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRevokeSession = async (sessionId) => {
    setRevokingId(sessionId);
    setMessage('');
    setError('');
    try {
      await revokeSession(sessionId);
      setMessage('Session successfully terminated.');
      setSessions(sessions.filter(s => s.id !== sessionId));
    } catch (err) {
      setError(err.message || 'Failed to revoke session.');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAll = async () => {
    setRevokingAll(true);
    setMessage('');
    setError('');
    try {
      await revokeAllSessions(true); // keep current
      setMessage('All other device sessions have been terminated.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to revoke other sessions.');
    } finally {
      setRevokingAll(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header Banner */}
      <div className="rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SECURITY & AUDIT: SESSIONS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Sessions & Security Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Review active citizen device logins, terminate remote sessions, and inspect recent authentication security events.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 border border-slate-200 dark:border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            {sessions.length > 1 && (
              <button
                type="button"
                onClick={handleRevokeAll}
                disabled={revokingAll}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{revokingAll ? 'Terminating...' : 'Logout Other Devices'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Active Sessions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Laptop className="w-4 h-4 text-indigo-500" />
            <span>Active Device Sessions ({sessions.length})</span>
          </h2>
          <span className="text-[11px] text-slate-500 font-mono">Real-time device tracking</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <LoadingSkeleton variant="cards" count={2} />
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-center space-y-2">
            <Shield className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No active sessions recorded.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((sess) => (
              <div 
                key={sess.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 depth-card flex items-start justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {sess.device_label || 'Browser Client'}
                    </span>
                    {sess.is_current && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        CURRENT DEVICE
                      </span>
                    )}
                  </div>
                  
                  <div className="text-[11px] text-slate-500 space-y-0.5 font-mono">
                    <p>IP: {sess.ip_address || '127.0.0.1'}</p>
                    <p>Active: {sess.last_active_at ? new Date(sess.last_active_at).toLocaleString() : 'Now'}</p>
                  </div>
                </div>

                {!sess.is_current && (
                  <button
                    type="button"
                    onClick={() => handleRevokeSession(sess.id)}
                    disabled={revokingId === sess.id}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Terminate Session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Activity Feed */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-500" />
            <span>Recent Security Events</span>
          </h2>
          <span className="text-[11px] text-slate-500 font-mono">Audit log entries</span>
        </div>

        {securityEvents.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
            No recent security anomalies or events detected.
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {securityEvents.slice(0, 10).map((evt, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white font-mono">
                        {evt.event_type || 'AUTH_EVENT'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        IP: {evt.ip_address || '—'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {evt.created_at ? new Date(evt.created_at).toLocaleString() : 'Recent'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

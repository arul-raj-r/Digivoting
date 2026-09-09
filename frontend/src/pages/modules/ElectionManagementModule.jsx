import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import electionApi from '../../services/electionApi';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ErrorState from '../../components/common/ErrorState';
import { 
  Sliders, 
  Play, 
  Pause, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Lock, 
  RefreshCw, 
  Users, 
  Vote, 
  ShieldCheck, 
  FileText, 
  Terminal,
  Activity,
  ArrowRight
} from 'lucide-react';

export default function ElectionManagementModule() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState('');
  const [election, setElection] = useState(null);
  const [monitoring, setMonitoring] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');

  // Confirmation dialogs
  const [dialogState, setDialogState] = useState({ open: false, action: null, title: '', message: '' });
  const [stopReason, setStopReason] = useState('');

  // Fetch elections list
  const fetchElections = async () => {
    try {
      const data = await electionApi.getElections();
      const list = Array.isArray(data) ? data : (data.results || []);
      setElections(list);
      if (!selectedElectionId && list.length > 0) {
        setSelectedElectionId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to load elections:', err);
    }
  };

  useEffect(() => {
    fetchElections();
  }, []);

  // Fetch election details, live monitoring, and audit logs
  const loadElectionDetails = async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [electionData, monitorData, auditData] = await Promise.all([
        electionApi.getElection(id),
        electionApi.getMonitoring(id).catch(() => null),
        electionApi.getAuditLogs(id).catch(() => []),
      ]);

      setElection(electionData);
      setMonitoring(monitorData);
      setAuditLogs(Array.isArray(auditData) ? auditData : (auditData.results || []));
    } catch (err) {
      console.error('Failed to load election management details:', err);
      setError(err.response?.data?.error || err.message || 'Unable to load election control parameters.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedElectionId) {
      loadElectionDetails(selectedElectionId);
    }
  }, [selectedElectionId]);

  // Execute lifecycle action
  const handleExecuteAction = async () => {
    if (!dialogState.action || !selectedElectionId) return;
    setActionLoading(true);
    setError(null);
    try {
      if (dialogState.action === 'start') {
        await electionApi.startElection(selectedElectionId);
        setActionSuccess('Election successfully started. Configuration is now locked.');
      } else if (dialogState.action === 'pause') {
        await electionApi.pauseElection(selectedElectionId);
        setActionSuccess('Election paused. Voting is temporarily halted.');
      } else if (dialogState.action === 'resume') {
        await electionApi.resumeElection(selectedElectionId);
        setActionSuccess('Election resumed. Voting is now open.');
      } else if (dialogState.action === 'complete') {
        await electionApi.completeElection(selectedElectionId);
        setActionSuccess('Election completed and closed for final tabulation.');
      } else if (dialogState.action === 'stop') {
        await electionApi.stopElection(selectedElectionId, stopReason);
        setActionSuccess('Election cancelled. Audit reason recorded.');
      }

      setDialogState({ open: false, action: null, title: '', message: '' });
      await loadElectionDetails(selectedElectionId);
      await fetchElections();
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to execute lifecycle operation.');
      setDialogState({ open: false, action: null, title: '', message: '' });
    } finally {
      setActionLoading(false);
    }
  };

  const status = election?.status || 'draft';
  const isLocked = status === 'active' || status === 'paused' || status === 'completed' || status === 'cancelled' || election?.is_locked;

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
              MODULE 4: OPERATIONAL CONTROL
            </span>
            <span className="text-xs text-slate-400">
              Lifecycle Governance
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Election Management & Control
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
            Directly manage election lifecycles, enforce configuration freezes, monitor participation metrics, and audit tamper-proof operational logs.
          </p>
        </div>

        {/* Election Selector Dropdown */}
        <div className="w-full md:w-72 space-y-1">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Selected Election:
          </label>
          <select
            value={selectedElectionId}
            onChange={(e) => setSelectedElectionId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {elections.map(el => (
              <option key={el.id} value={el.id}>
                {el.title} ({el.status.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <LoadingSkeleton variant="header" />
          <LoadingSkeleton variant="cards" count={3} />
        </div>
      ) : !election ? (
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-400">Please select or create an election to view management controls.</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Operational Status & Lifecycle Action Controls */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  CURRENT CONTEST STATUS
                </span>
                <div className="flex items-center gap-3 mt-1">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {status}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                    status === 'active' 
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' 
                      : status === 'paused'
                      ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                      : status === 'completed'
                      ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>
                    {status === 'active' ? '● Voting Active' : status}
                  </span>
                </div>
              </div>

              {/* Locked Notice */}
              {isLocked && (
                <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Election configuration is locked because voting has started.</span>
                </div>
              )}
            </div>

            {/* Lifecycle Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              
              {/* Start Election */}
              {(status === 'draft' || status === 'configured' || status === 'scheduled') && (
                <button
                  type="button"
                  onClick={() => setDialogState({
                    open: true,
                    action: 'start',
                    title: 'Start Election Voting',
                    message: 'Voting will open immediately to all registered eligible voters. Rules and candidates will be locked from further edits.'
                  })}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Start Election</span>
                </button>
              )}

              {/* Pause Election */}
              {status === 'active' && (
                <button
                  type="button"
                  onClick={() => setDialogState({
                    open: true,
                    action: 'pause',
                    title: 'Pause Voting Temporarily',
                    message: 'Voting will be suspended immediately. Voters in the booth will not be able to cast ballots until resumed.'
                  })}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-600/20 transition-all flex items-center gap-2"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause Election</span>
                </button>
              )}

              {/* Resume Election */}
              {status === 'paused' && (
                <button
                  type="button"
                  onClick={() => setDialogState({
                    open: true,
                    action: 'resume',
                    title: 'Resume Voting',
                    message: 'Voting will reopen immediately for eligible voters.'
                  })}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Resume Election</span>
                </button>
              )}

              {/* Complete Election */}
              {(status === 'active' || status === 'paused') && (
                <button
                  type="button"
                  onClick={() => setDialogState({
                    open: true,
                    action: 'complete',
                    title: 'Complete & Conclude Election',
                    message: 'Voting will permanently terminate. The ledger will be sealed and final results tabulated.'
                  })}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Election</span>
                </button>
              )}

              {/* Cancel Election */}
              {status !== 'completed' && status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={() => setDialogState({
                    open: true,
                    action: 'stop',
                    title: 'Cancel / Abort Election',
                    message: 'Are you sure you want to permanently cancel this election? This action cannot be undone.'
                  })}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Cancel Election</span>
                </button>
              )}

              <Link
                to={`/creator/elections/${selectedElectionId}`}
                className="ml-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors flex items-center gap-2"
              >
                <span>Full Election Hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Turnout & Monitoring KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm depth-card">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Eligible Voters</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-2">
                {monitoring?.total_eligible_voters || 0}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm depth-card">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ballots Cast</span>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-2">
                {monitoring?.votes_cast || 0}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm depth-card">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Turnout</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-2">
                {monitoring?.turnout_percentage ? `${Number(monitoring.turnout_percentage).toFixed(1)}%` : '0.0%'}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm depth-card">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Candidates</span>
              <p className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono mt-2">
                {monitoring?.candidate_count || 0}
              </p>
            </div>
          </div>

          {/* Real Operational Audit Trail */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Operational Audit Trail
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {auditLogs.length} events logged
              </span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {auditLogs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No audit actions recorded for this election yet.</p>
              ) : (
                auditLogs.map((log) => (
                  <div 
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between gap-4 font-mono"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase shrink-0">
                        {log.action}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300 truncate">
                        {log.actor_email || log.actor || 'System'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Recent'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* Confirmation Modal */}
      {dialogState.open && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {dialogState.title}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {dialogState.message}
            </p>

            {dialogState.action === 'stop' && (
              <div className="space-y-1 pt-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Reason for Cancellation:
                </label>
                <input
                  type="text"
                  value={stopReason}
                  onChange={(e) => setStopReason(e.target.value)}
                  placeholder="e.g. Quorum unfulfilled, committee decree"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            )}

            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setDialogState({ open: false, action: null, title: '', message: '' })}
                disabled={actionLoading}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={actionLoading}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all"
              >
                {actionLoading ? 'Executing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

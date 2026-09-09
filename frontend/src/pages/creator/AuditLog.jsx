import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import electionsApi from '../../api/elections';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import { 
  Search, 
  Filter, 
  ShieldCheck, 
  ArrowLeft, 
  User, 
  Download,
  RefreshCw
} from 'lucide-react';

export default function AuditLog() {
  const { id } = useParams();
  const [election, setElection] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [electionData, logsData] = await Promise.all([
        electionsApi.getElection(id),
        electionsApi.getElectionAuditLogs(id),
      ]);
      setElection(electionData);
      setLogs(logsData.results || logsData || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        <LoadingSkeleton variant="header" />
        <LoadingSkeleton variant="table" count={6} />
      </div>
    );
  }

  if (error || !election) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <ErrorState 
          title="Audit log unavailable"
          message={error || 'Could not load audit trail records for this election.'}
          onRetry={fetchData}
        />
      </div>
    );
  }

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const actionStr = String(log.action || '').toLowerCase();
    const detailsStr = typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '').toLowerCase();
    const actorStr = String(log.actor_email || log.actor || '').toLowerCase();
    const q = searchQuery.toLowerCase();

    const matchesSearch = !q || actionStr.includes(q) || detailsStr.includes(q) || actorStr.includes(q);
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const distinctActions = ['ALL', ...Array.from(new Set(logs.map(l => l.action).filter(Boolean)))];

  const getActionBadgeColor = (action) => {
    if (action.includes('stopped') || action.includes('deleted') || action.includes('cancelled')) {
      return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    }
    if (action.includes('started') || action.includes('published')) {
      return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
    if (action.includes('rules') || action.includes('config') || action.includes('status')) {
      return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    }
    return 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800';
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `audit_log_${id}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    document.body.removeChild(dlAnchor);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      
      {/* Back to Hub */}
      <div>
        <Link 
          to={`/creator/elections/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Election Command Center</span>
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                Module 7 of 8
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5" />
                Audit Trail Logged
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Election Audit Log
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
              Chronological audit trail of administrative modifications, candidate adjustments, roster additions, and lifecycle status changes for <span className="font-semibold text-slate-800 dark:text-slate-200">"{election.title}"</span>.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchData}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              disabled={logs.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit actions, actors, or details..."
            className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-sky-500/20 focus:outline-none dark:text-white"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {distinctActions.map(action => (
            <button
              key={action}
              type="button"
              onClick={() => setActionFilter(action)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                actionFilter === action
                  ? 'bg-slate-900 text-white shadow-sm dark:bg-sky-600'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {action === 'ALL' ? 'All Actions' : action.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Log Feed */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Audit Trail Entries ({filteredLogs.length})
          </h2>
          <span className="text-xs text-slate-400">
            System Log Database
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <EmptyState
            title="No audit entries matched"
            description="No log records matched your search query. Try resetting filters."
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredLogs.map(log => (
              <div key={log.id} className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getActionBadgeColor(log.action)}`}>
                      {log.action}
                    </span>
                  </div>

                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-mono text-[11px] bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg break-all">
                    {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : String(log.details)}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Actor: {log.actor_email || log.actor || 'System'}
                    </span>
                    {log.ip_address && (
                      <span>IP: {log.ip_address}</span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 text-right text-[11px] text-slate-400 flex sm:flex-col items-center sm:items-end gap-1">
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    {new Date(log.created_at).toLocaleDateString()}
                  </span>
                  <span>
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

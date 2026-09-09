import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { electionsApi } from '../../api/elections';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ErrorState from '../../components/common/ErrorState';
import { 
  Vote, 
  PlusCircle, 
  Search, 
  Calendar, 
  Users, 
  UserCheck, 
  CheckCircle2, 
  ArrowRight, 
  Clock, 
  Layers, 
  Building2, 
  ExternalLink,
  Shield,
  Activity,
  Filter,
  RefreshCw
} from 'lucide-react';

export default function MyElections() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [elections, setElections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchElections = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await electionsApi.getElections();
      setElections(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load elections:', err);
      setError(err.message || 'Could not load your elections. Please verify your connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchElections();
  }, [fetchElections]);

  const filterOptions = [
    { id: 'ALL', label: 'All Elections' },
    { id: 'DRAFT', label: 'Draft' },
    { id: 'SCHEDULED', label: 'Scheduled' },
    { id: 'ACTIVE', label: 'Live' },
    { id: 'PAUSED', label: 'Paused' },
    { id: 'COMPLETED', label: 'Completed' },
    { id: 'CANCELLED', label: 'Cancelled' },
  ];

  const filteredElections = elections.filter((e) => {
    const title = (e.title || e.name || '').toLowerCase();
    const org = (e.organization || '').toLowerCase();
    const desc = (e.description || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = title.includes(q) || org.includes(q) || desc.includes(q);
    const status = (e.status || '').toUpperCase();
    const matchesStatus = 
      statusFilter === 'ALL' || 
      (statusFilter === 'ACTIVE' && (status === 'ACTIVE' || status === 'LIVE')) ||
      status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate live summary metrics
  const counts = {
    total: elections.length,
    draft: elections.filter(e => (e.status || '').toLowerCase() === 'draft').length,
    scheduled: elections.filter(e => (e.status || '').toLowerCase() === 'scheduled').length,
    live: elections.filter(e => ['active', 'live'].includes((e.status || '').toLowerCase())).length,
    completed: elections.filter(e => (e.status || '').toLowerCase() === 'completed').length,
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Not scheduled';
    try {
      return new Date(isoString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const getTypeLabel = (type) => {
    const map = {
      academic: 'Academic / Student Council',
      club: 'Club / Society',
      workplace: 'Workplace / Committee',
      poll: 'Internal Poll',
      general: 'General Election',
      organizational: 'Organizational',
      referendum: 'Referendum'
    };
    return map[type] || type || 'General';
  };

  if (isLoading) {
    return (
      <div className="space-y-6 pb-12">
        <LoadingSkeleton variant="header" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
          ))}
        </div>
        <LoadingSkeleton variant="cards" count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <ErrorState 
          title="Unable to Load Elections"
          message={error}
          onRetry={fetchElections}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Vote className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                My Elections
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage, monitor, and publish your organizational elections, candidate rosters, and voter rolls.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchElections}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/elections/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/35 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Election</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Created</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{counts.total}</div>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Drafts</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{counts.draft}</div>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Scheduled</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{counts.scheduled}</div>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Live (Active)</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{counts.live}</div>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Completed</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{counts.completed}</div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search elections by title, organization..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setStatusFilter(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === opt.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-[#0d1527] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Elections List */}
      {filteredElections.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Vote className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {searchQuery || statusFilter !== 'ALL' ? 'No matching elections found' : 'No elections created yet'}
            </h3>
            <p className="text-xs text-slate-500">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your search query or status filter to locate the election.'
                : 'You have not created any organizational elections yet. Start by defining your election details.'}
            </p>
          </div>
          {searchQuery || statusFilter !== 'ALL' ? (
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Clear filters
            </button>
          ) : (
            <div className="pt-2">
              <Link
                to="/elections/create"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/25"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Your First Election</span>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredElections.map((election) => {
            const isOwner = election.created_by === user?.id || election.created_by_email === user?.email;
            return (
              <div
                key={election.id}
                className="group p-5 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200/90 dark:border-slate-800/90 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Left details */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={election.status} />
                    <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {getTypeLabel(election.election_type)}
                    </span>
                    {election.organization && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/40 dark:border-indigo-800/40">
                        <Building2 className="w-3 h-3" />
                        <span>{election.organization}</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <Link
                      to={`/elections/${election.id}`}
                      className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate block"
                    >
                      {election.title || election.name}
                    </Link>
                    {election.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {election.description}
                      </p>
                    )}
                  </div>

                  {/* Schedule & Ownership Meta */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Starts: {formatDate(election.start_datetime)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Ends: {formatDate(election.end_datetime)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="text-slate-400">Creator:</span>
                      <span className={isOwner ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-slate-300'}>
                        {isOwner ? 'You (Owner)' : election.created_by_email || 'Creator'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Metrics & Workspace Action */}
                <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800/60">
                  <Link
                    to={`/elections/${election.id}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 hover:text-white border border-indigo-200 dark:border-indigo-800/60 text-xs font-bold transition-all shadow-sm group-hover:scale-[1.02]"
                  >
                    <span>Open Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

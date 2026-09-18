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
  ShieldCheck, 
  RefreshCw,
  Lock
} from 'lucide-react';

export default function MyElections() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [elections, setElections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');

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

  const sortedElections = [...filteredElections].sort((a, b) => {
    if (sortBy === 'newest') {
      const dateA = new Date(a.created_at || a.start_datetime || 0);
      const dateB = new Date(b.created_at || b.start_datetime || 0);
      return dateB - dateA;
    }
    if (sortBy === 'oldest') {
      const dateA = new Date(a.created_at || a.start_datetime || 0);
      const dateB = new Date(b.created_at || b.start_datetime || 0);
      return dateA - dateB;
    }
    if (sortBy === 'title') {
      const titleA = (a.title || a.name || '').toLowerCase();
      const titleB = (b.title || b.name || '').toLowerCase();
      return titleA.localeCompare(titleB);
    }
    return 0;
  });

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
      return new Date(isoString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-6">
        <LoadingSkeleton variant="header" />
        <LoadingSkeleton variant="metrics" count={5} />
        <LoadingSkeleton variant="cards" count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <ErrorState
          title="Unable to Load Elections"
          message={error}
          onRetry={fetchElections}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              My Elections
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-100 dark:bg-[#101216] text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-[#262a33] uppercase">
              Creator Workspace
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
            Administer election charters, import eligible voter rosters, and monitor live voter turnout.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchElections}
            className="p-2.5 rounded-lg border border-stone-300 dark:border-[#262a33] text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-[#101216] transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/elections/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#101216] hover:bg-[#171a20] dark:bg-[#1a4231] dark:hover:bg-[#1f4f3b] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create election</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33]">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Total created</span>
          <div className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-1">{counts.total}</div>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33]">
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Drafts</span>
          <div className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-1">{counts.draft}</div>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33]">
          <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-300 uppercase tracking-wider">Scheduled</span>
          <div className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-1">{counts.scheduled}</div>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33]">
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Live now</span>
          <div className="text-2xl font-serif font-bold text-emerald-700 dark:text-emerald-400 mt-1">{counts.live}</div>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Completed</span>
          <div className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-1">{counts.completed}</div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search elections by title, organization..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-lg bg-white dark:bg-[#171a20] border border-stone-300 dark:border-[#262a33] text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 justify-between lg:justify-end">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {filterOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setStatusFilter(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === opt.id
                    ? 'bg-[#1a4231] text-white shadow-xs'
                    : 'bg-white dark:bg-[#171a20] text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-[#262a33] hover:bg-stone-50 dark:hover:bg-[#101216]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-stone-500 whitespace-nowrap">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#171a20] border border-stone-300 dark:border-[#262a33] text-stone-700 dark:text-stone-300 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Elections List */}
      {sortedElections.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-white dark:bg-[#171a20] border border-dashed border-stone-300 dark:border-[#262a33] space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#1a4231]/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto">
            <Vote className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="font-serif text-base font-bold text-stone-900 dark:text-white">
              {searchQuery || statusFilter !== 'ALL' ? 'No matching elections found' : 'No elections created yet'}
            </h3>
            <p className="text-xs text-stone-500">
              {searchQuery || statusFilter !== 'ALL'
                ? 'Try adjusting your search query or status filter.'
                : 'You have not created any elections yet. Define a charter and upload your voter roster.'}
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/elections/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a4231] text-white text-xs font-semibold hover:bg-[#1f4f3b]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create election</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sortedElections.map((election) => (
            <div
              key={election.id}
              className="p-5 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] hover:border-stone-400 dark:hover:border-stone-600 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={election.status} />
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-stone-100 dark:bg-[#101216] text-stone-600 dark:text-stone-300 capitalize">
                    {election.election_type || 'Standard'}
                  </span>
                  {election.organization && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-stone-100 dark:bg-[#101216] text-stone-600 dark:text-stone-300">
                      <Building2 className="w-3 h-3 text-stone-400" />
                      <span>{election.organization}</span>
                    </span>
                  )}
                </div>

                <div>
                  <Link
                    to={`/elections/${election.id}`}
                    className="font-serif text-lg font-bold text-stone-900 dark:text-white hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors truncate block"
                  >
                    {election.title || election.name}
                  </Link>
                  <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-1 mt-0.5">
                    {election.description || 'No description provided.'}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs text-stone-500 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    <span>{formatDate(election.start_datetime)}</span>
                  </span>
                  <span className="font-mono text-[11px]">
                    ID: {election.id.slice(0, 8)}...
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                <Link
                  to={`/election/${election.id}`}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-[#262a33] text-stone-700 dark:text-stone-300 text-xs font-semibold hover:bg-stone-50 dark:hover:bg-[#101216]"
                >
                  Public link
                </Link>
                <Link
                  to={`/elections/${election.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#101216] dark:bg-[#1a4231] text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <span>Control Center</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

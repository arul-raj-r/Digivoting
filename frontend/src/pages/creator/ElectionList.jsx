import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { electionsApi } from '../../api/elections';
import StatusBadge from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ErrorState from '../../components/common/ErrorState';
import { 
  PlusCircle, 
  Search, 
  Vote, 
  Calendar, 
  ChevronRight, 
  Clock,
  Layers
} from 'lucide-react';

export default function ElectionList() {
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
      setError(err.message || 'Could not load your elections from the server. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchElections();
  }, [fetchElections]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="header" />
        <LoadingSkeleton variant="cards" count={6} />
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

  const filteredElections = elections.filter(e => {
    const title = (e.title || e.name || '').toLowerCase();
    const desc = (e.description || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = title.includes(q) || desc.includes(q);
    const matchesStatus = statusFilter === 'ALL' || (e.status || '').toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses = ['ALL', 'DRAFT', 'CONFIGURED', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

  const getTypeLabel = (type) => {
    const map = {
      academic: 'Academic / Student Council',
      club: 'Club / Society',
      workplace: 'Workplace / Committee',
      poll: 'Internal Poll',
      general: 'General Election',
      organizational: 'Organizational Poll'
    };
    return map[type] || type || 'General';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Create CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Vote className="w-5 h-5" />
            </div>
            Manage Your Organization's Elections
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Create, configure, schedule, and oversee voting for your school, club, or workplace.
          </p>
        </div>

        <div className="shrink-0">
          <Link
            to="/creator/elections/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.01]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Election</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search elections..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {statuses.map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all shrink-0 ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {st === 'ALL' ? 'All Statuses' : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Election Cards Grid or Empty State */}
      {filteredElections.length === 0 ? (
        <EmptyState
          title={searchQuery || statusFilter !== 'ALL' ? 'No Matching Elections Found' : 'No Elections Created Yet'}
          description={
            searchQuery || statusFilter !== 'ALL'
              ? 'Try clearing your search query or switching your status filter.'
              : 'Create your first organizational vote — such as a Student Council Election, Class Representative Poll, or Committee Vote.'
          }
          actionLabel={searchQuery || statusFilter !== 'ALL' ? 'Clear Filters' : 'Create Election'}
          onAction={
            searchQuery || statusFilter !== 'ALL'
              ? () => { setSearchQuery(''); setStatusFilter('ALL'); }
              : null
          }
          actionHref={searchQuery || statusFilter !== 'ALL' ? null : '/creator/elections/new'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredElections.map(election => (
            <div
              key={election.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {getTypeLabel(election.election_type)}
                  </span>
                  <StatusBadge status={election.status} />
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                  {election.title || election.name}
                </h3>
                
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                  {election.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {election.start_datetime 
                      ? new Date(election.start_datetime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Dates unscheduled'}
                  </span>
                </div>

                <Link
                  to={`/creator/elections/${election.id}`}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Open Election Hub</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

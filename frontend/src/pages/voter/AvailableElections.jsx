import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import electionApi from '../../services/electionApi';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ErrorState from '../../components/common/ErrorState';
import { 
  Vote, 
  Search, 
  Calendar, 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  Check, 
  RefreshCw, 
  Lock, 
  Eye, 
  BarChart3,
  HelpCircle
} from 'lucide-react';

export default function AvailableElections() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'LIVE', 'UPCOMING', 'COMPLETED'
  const [eligibilityFilter, setEligibilityFilter] = useState('ALL'); // 'ALL', 'ELIGIBLE', 'INELIGIBLE'

  const fetchAvailableElections = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await electionApi.getVoterOverview();
      const list = Array.isArray(data) ? data : (data?.elections || data?.results || []);
      setElections(list);
    } catch (err) {
      console.error('Failed to load available elections:', err);
      try {
        const fallback = await electionApi.getVoterEligibleElections();
        const rawList = Array.isArray(fallback) ? fallback : (fallback?.elections || fallback?.results || []);
        const mapped = rawList.map(e => ({
          ...e,
          is_eligible: true,
          already_voted: e.has_voted,
        }));
        setElections(mapped);
      } catch (fallbackErr) {
        setError(err.response?.data?.error || err.message || 'Unable to load available elections.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableElections();
  }, []);

  const filteredElections = elections.filter((election) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery = !query || 
      (election.title || '').toLowerCase().includes(query) ||
      (election.organization || '').toLowerCase().includes(query) ||
      (election.position_category || '').toLowerCase().includes(query) ||
      (election.description || '').toLowerCase().includes(query);

    const status = (election.status || '').toLowerCase();
    let matchesStatus = true;
    if (statusFilter === 'LIVE') {
      matchesStatus = status === 'active' || status === 'live';
    } else if (statusFilter === 'UPCOMING') {
      matchesStatus = status === 'scheduled' || status === 'configured';
    } else if (statusFilter === 'COMPLETED') {
      matchesStatus = status === 'completed';
    }

    let matchesEligibility = true;
    if (eligibilityFilter === 'ELIGIBLE') {
      matchesEligibility = Boolean(election.is_eligible);
    } else if (eligibilityFilter === 'INELIGIBLE') {
      matchesEligibility = !election.is_eligible;
    }

    return matchesQuery && matchesStatus && matchesEligibility;
  });

  const totalEligible = elections.filter(e => e.is_eligible).length;
  const totalLive = elections.filter(e => ['active', 'live'].includes((e.status || '').toLowerCase())).length;
  const totalVoted = elections.filter(e => e.already_voted).length;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'TBD';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 pb-16 font-sans">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              Available Elections
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-50 dark:bg-[#1a4231]/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 uppercase">
              Roster Discovery
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1">
            Browse published elections across your institution. Ballots can be submitted only if your registered email is authorized on the official roster.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAvailableElections}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-[#171a20] border border-stone-300 dark:border-[#262a33] text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-[#101216] shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : 'text-stone-400'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] shadow-xs">
          <span className="text-xs text-stone-500 font-medium">Published elections</span>
          <p className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">{elections.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] shadow-xs">
          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Eligible to vote</span>
          <p className="font-serif text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{totalEligible}</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] shadow-xs">
          <span className="text-xs text-stone-600 dark:text-stone-300 font-medium">Active now</span>
          <p className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">{totalLive}</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] shadow-xs">
          <span className="text-xs text-stone-500 font-medium">Ballots cast</span>
          <p className="font-serif text-2xl font-bold text-stone-900 dark:text-stone-100 mt-1">{totalVoted}</p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search by election title, organization, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg text-xs bg-stone-50 dark:bg-[#101216] border border-stone-200 dark:border-[#262a33] focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 text-stone-900 dark:text-stone-100 transition-all font-sans"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Status Filter: All, Live, Upcoming, Completed */}
            <div className="flex items-center gap-1 bg-stone-100 dark:bg-[#101216] p-1 rounded-lg border border-stone-200 dark:border-[#262a33] text-xs">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'LIVE', label: 'Live' },
                { id: 'UPCOMING', label: 'Upcoming' },
                { id: 'COMPLETED', label: 'Completed' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-white dark:bg-[#171a20] text-emerald-800 dark:text-emerald-300 shadow-xs font-bold'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Eligibility Filter */}
            <div className="flex items-center gap-1 bg-stone-100 dark:bg-[#101216] p-1 rounded-lg border border-stone-200 dark:border-[#262a33] text-xs">
              {[
                { id: 'ALL', label: 'All rosters' },
                { id: 'ELIGIBLE', label: 'Eligible only' },
                { id: 'INELIGIBLE', label: 'Ineligible' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEligibilityFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    eligibilityFilter === tab.id
                      ? 'bg-white dark:bg-[#171a20] text-emerald-800 dark:text-emerald-300 shadow-xs font-bold'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="space-y-4">
          <LoadingSkeleton variant="cards" count={3} />
        </div>
      )}

      {error && !loading && (
        <ErrorState
          title="Error Loading Available Elections"
          message={error}
          onRetry={fetchAvailableElections}
        />
      )}

      {/* Empty State */}
      {!loading && !error && filteredElections.length === 0 && (
        <div className="text-center py-16 px-4 rounded-xl bg-white dark:bg-[#171a20] border border-dashed border-stone-300 dark:border-[#262a33]">
          <div className="w-12 h-12 rounded-xl bg-[#1a4231]/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <Vote className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-base font-bold text-stone-900 dark:text-white">
            No Elections Found
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto mt-1">
            {searchQuery || statusFilter !== 'ALL' || eligibilityFilter !== 'ALL'
              ? 'Try changing your search terms or filter selection.'
              : 'There are no published elections available on the platform at this time.'}
          </p>
        </div>
      )}

      {/* Election Cards Grid */}
      {!loading && !error && filteredElections.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredElections.map((election) => {
            const isLive = ['active', 'live'].includes((election.status || '').toLowerCase());
            const isUpcoming = ['scheduled', 'configured'].includes((election.status || '').toLowerCase());
            const isCompleted = (election.status || '').toLowerCase() === 'completed';
            const isEligible = Boolean(election.is_eligible);
            const hasVoted = Boolean(election.already_voted);

            return (
              <div 
                key={election.id}
                className={`p-5 sm:p-6 rounded-xl bg-white dark:bg-[#171a20] border transition-all flex flex-col justify-between gap-5 shadow-xs ${
                  isLive 
                    ? 'border-emerald-600/40 dark:border-emerald-500/30' 
                    : isUpcoming
                    ? 'border-amber-600/30 dark:border-amber-500/20'
                    : 'border-stone-200 dark:border-[#262a33]'
                }`}
              >
                <div className="space-y-3">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={election.status || 'scheduled'} />
                      {election.organization && (
                        <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-stone-100 dark:bg-[#101216] text-stone-700 dark:text-stone-300">
                          <Building2 className="w-3 h-3 text-stone-400" />
                          {election.organization}
                        </span>
                      )}
                    </div>

                    {/* Eligibility Badge */}
                    <div>
                      {isEligible ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-[#1a4231]/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                          <CheckCircle2 className="w-3 h-3" />
                          Eligible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-[#101216] px-2 py-0.5 rounded">
                          <Lock className="w-3 h-3" />
                          Not on roster
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-serif text-base font-bold text-stone-900 dark:text-white leading-snug">
                      {election.title}
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 mt-1 leading-relaxed">
                      {election.description || 'No detailed instructions provided.'}
                    </p>
                  </div>

                  {/* Period Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-stone-100 dark:border-[#262a33]">
                    <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                      <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">
                        {formatDate(election.start_datetime)} – {formatDate(election.end_datetime)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasVoted ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Ballot cast
                        </span>
                      ) : isLive && isEligible ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Voting open
                        </span>
                      ) : isUpcoming ? (
                        <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Pending start
                        </span>
                      ) : isCompleted ? (
                        <span className="text-stone-500 font-medium">Concluded</span>
                      ) : (
                        <span className="text-stone-400 italic text-[11px]">Not on roster</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Bar */}
                <div className="pt-3 border-t border-stone-100 dark:border-[#262a33] flex items-center justify-between gap-3">
                  <span className="text-[11px] text-stone-400 font-mono">
                    ID: {election.id.slice(0, 8)}...
                  </span>

                  <div className="flex items-center gap-2">
                    {/* CASE: Completed Election -> Strictly Read-Only View */}
                    {isCompleted ? (
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/election/${election.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-stone-300 dark:border-[#262a33] text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-[#101216]"
                        >
                          <Eye className="w-3.5 h-3.5 text-stone-400" />
                          <span>View election</span>
                        </Link>
                        <Link
                          to={`/elections/${election.id}/results`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 dark:bg-[#101216] text-stone-800 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-800"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>Results</span>
                        </Link>
                      </div>
                    ) : (
                      /* CASE: Live or Upcoming Election -> Enter Election */
                      <div className="flex items-center gap-2">
                        {hasVoted ? (
                          <Link
                            to="/voting-history"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-[#1a4231]/40 border border-emerald-200 dark:border-emerald-800/60"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Receipt</span>
                          </Link>
                        ) : (
                          <Link
                            to={`/election/${election.id}`}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              isLive && isEligible
                                ? 'bg-[#1a4231] hover:bg-[#1f4f3b] text-white shadow-xs'
                                : 'bg-stone-100 dark:bg-[#101216] text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-[#262a33] hover:bg-stone-200 dark:hover:bg-stone-800'
                            }`}
                          >
                            <span>Enter election</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

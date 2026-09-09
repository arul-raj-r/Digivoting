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
  Filter, 
  Calendar, 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  Award, 
  Check, 
  ExternalLink,
  RefreshCw,
  Lock,
  Layers
} from 'lucide-react';

export default function AvailableElections() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [eligibilityFilter, setEligibilityFilter] = useState('ALL'); // 'ALL', 'ELIGIBLE', 'INELIGIBLE'

  const fetchAvailableElections = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch voter overview which inspects eligible voter rosters for this user
      const data = await electionApi.getVoterOverview();
      const list = Array.isArray(data) ? data : (data?.results || []);
      setElections(list);
    } catch (err) {
      console.error('Failed to load available elections:', err);
      // Attempt fallback to eligible list
      try {
        const fallback = await electionApi.getVoterEligibleElections();
        const rawList = fallback?.elections || [];
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
    // Search query filter
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery = !query || 
      (election.title || '').toLowerCase().includes(query) ||
      (election.organization || '').toLowerCase().includes(query) ||
      (election.position_category || '').toLowerCase().includes(query) ||
      (election.description || '').toLowerCase().includes(query);

    // Status filter
    const status = (election.status || '').toLowerCase();
    let matchesStatus = true;
    if (statusFilter === 'LIVE') {
      matchesStatus = status === 'active' || status === 'live';
    } else if (statusFilter === 'SCHEDULED') {
      matchesStatus = status === 'scheduled';
    } else if (statusFilter === 'COMPLETED') {
      matchesStatus = status === 'completed';
    } else if (statusFilter === 'PAUSED') {
      matchesStatus = status === 'paused';
    }

    // Eligibility filter
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

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Available Elections
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Voter Roster Check
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse published elections. You can participate and cast your ballot only if your email exists on the creator-uploaded roster.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAvailableElections}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-sm transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-500' : 'text-slate-400'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Published Elections</span>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{elections.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Eligible To Vote</span>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{totalEligible}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Active Right Now</span>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{totalLive}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Ballots Cast</span>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{totalVoted}</p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by election name, organization, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              {['ALL', 'LIVE', 'SCHEDULED', 'COMPLETED'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    statusFilter === tab
                      ? 'bg-white dark:bg-[#0d1527] text-indigo-600 dark:text-indigo-400 shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab === 'ALL' ? 'All Status' : tab}
                </button>
              ))}
            </div>

            {/* Eligibility Filter */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'ELIGIBLE', label: 'Eligible Only' },
                { id: 'INELIGIBLE', label: 'Ineligible' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEligibilityFilter(tab.id)}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                    eligibilityFilter === tab.id
                      ? 'bg-white dark:bg-[#0d1527] text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
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

      {/* Election Cards Grid */}
      {!loading && !error && filteredElections.length === 0 && (
        <div className="text-center py-16 px-4 rounded-3xl bg-white dark:bg-[#0d1527] border border-dashed border-slate-300 dark:border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <Vote className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No Elections Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
            {searchQuery || statusFilter !== 'ALL' || eligibilityFilter !== 'ALL'
              ? 'Try changing your search terms or filter criteria.'
              : 'There are no published elections available on the platform at this time.'}
          </p>
        </div>
      )}

      {!loading && !error && filteredElections.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredElections.map((election) => {
            const isLive = ['active', 'live'].includes((election.status || '').toLowerCase());
            const isScheduled = (election.status || '').toLowerCase() === 'scheduled';
            const isCompleted = (election.status || '').toLowerCase() === 'completed';
            const isEligible = Boolean(election.is_eligible);
            const hasVoted = Boolean(election.already_voted);
            const verificationStatus = election.verification_status;
            const isVerified = verificationStatus === 'verified';

            return (
              <div 
                key={election.id}
                className={`p-6 rounded-2xl bg-white dark:bg-[#0d1527] border transition-all flex flex-col justify-between gap-6 shadow-sm hover:shadow-md ${
                  isEligible 
                    ? 'border-indigo-100 dark:border-indigo-950/60 ring-1 ring-indigo-500/10' 
                    : 'border-slate-200 dark:border-slate-800 opacity-90'
                }`}
              >
                <div className="space-y-4">
                  {/* Card Header Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={election.status || 'scheduled'} />
                      {election.organization && (
                        <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {election.organization}
                        </span>
                      )}
                      {election.position_category && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                          {election.position_category}
                        </span>
                      )}
                    </div>

                    {/* Eligibility Badge */}
                    <div>
                      {isEligible ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Eligible Voter
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                          <Lock className="w-3 h-3" />
                          Not in Voter Roster
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {election.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {election.description || 'No detailed instructions provided.'}
                    </p>
                  </div>

                  {/* Period & Verification Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {election.start_datetime ? new Date(election.start_datetime).toLocaleDateString() : 'TBD'} – {election.end_datetime ? new Date(election.end_datetime).toLocaleDateString() : 'TBD'}
                      </span>
                    </div>

                    {/* User Voting Status */}
                    <div className="flex items-center gap-2">
                      {hasVoted ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Ballot Cast
                        </span>
                      ) : isEligible && isVerified ? (
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Identity Verified
                        </span>
                      ) : isEligible ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Verification Required
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Participation locked</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400 font-mono">
                    ID: {election.id.slice(0, 8)}...
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Results link if completed */}
                    {isCompleted && (
                      <Link
                        to={`/results?electionId=${election.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Results</span>
                      </Link>
                    )}

                    {/* Participation / Vote Button */}
                    {isEligible && !hasVoted && (
                      <button
                        type="button"
                        onClick={() => navigate(`/elections/${election.id}/participate`)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                          isLive
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                            : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span>{isLive ? 'Participate & Vote' : 'Verify Identity'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Already Voted Badge */}
                    {isEligible && hasVoted && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/50">
                        <Check className="w-3.5 h-3.5" />
                        Voted
                      </span>
                    )}

                    {/* Ineligible Explanation */}
                    {!isEligible && (
                      <span className="text-[11px] text-slate-400 italic">
                        Not eligible to vote
                      </span>
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

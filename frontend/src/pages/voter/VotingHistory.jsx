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
  ArrowRight, 
  Award, 
  RefreshCw, 
  FileText
} from 'lucide-react';

export default function VotingHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await electionApi.getVoterOverview();
      const list = Array.isArray(data) ? data : (data?.results || []);
      const votedList = list.filter(e => e.already_voted || e.has_voted);
      setElections(votedList);
    } catch (err) {
      console.error('Failed to load voting history:', err);
      try {
        const fallback = await electionApi.getVoterEligibleElections();
        const rawList = fallback?.elections || [];
        const votedList = rawList.filter(e => e.has_voted || e.already_voted);
        setElections(votedList);
      } catch (fallbackErr) {
        setError(err.response?.data?.error || err.message || 'Unable to retrieve your voting records.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filtered = elections.filter((e) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (e.title || '').toLowerCase().includes(q) ||
      (e.organization || '').toLowerCase().includes(q) ||
      (e.position_category || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-[#1a4231]/40 px-2.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
              AUDIT RECORD
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white tracking-tight">
            Voting History
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-xl">
            Official record of elections where you verified your identity and submitted a confidential ballot.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchHistory}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-[#171a20] border border-stone-300 dark:border-[#262a33] text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-[#101216] shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : 'text-stone-400'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Ballot Secrecy Guarantee Card */}
      <div className="p-4 sm:p-5 rounded-xl bg-emerald-50/50 dark:bg-[#1a4231]/20 border border-emerald-200/60 dark:border-emerald-800/40 flex items-start gap-3.5">
        <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-emerald-950 dark:text-emerald-200">
            Ballot Secrecy Guarantee
          </p>
          <p className="text-emerald-900/80 dark:text-emerald-300/80 leading-relaxed">
            In accordance with digital voting integrity standards, DigiVote records cast choices in an architecturally isolated table decoupled from your user identity. This history confirms that you exercised your vote in the contests below, while guaranteeing that your individual candidate selection remains strictly confidential.
          </p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search participated elections..."
            className="w-full pl-9 pr-4 py-2 rounded-lg text-xs bg-white dark:bg-[#171a20] border border-stone-300 dark:border-[#262a33] text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-all font-sans"
          />
        </div>
        <span className="text-xs font-medium text-stone-500 font-mono">
          {filtered.length} {filtered.length === 1 ? 'Contest' : 'Contests'} Recorded
        </span>
      </div>

      {/* Content List */}
      {loading ? (
        <div className="space-y-4">
          <LoadingSkeleton variant="cards" count={3} />
        </div>
      ) : error ? (
        <ErrorState
          title="Unable to Load Records"
          message={error}
          onRetry={fetchHistory}
        />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-[#101216] flex items-center justify-center mx-auto text-stone-400">
            <Vote className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-base font-bold text-stone-900 dark:text-white">
              No Participated Contests Found
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              {searchQuery ? 'No past balloting records match your search filter.' : 'You have not submitted ballots in any elections yet. Browse open elections to participate.'}
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/available-elections"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a4231] hover:bg-[#1f4f3b] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <span>View available elections</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((election) => (
            <div
              key={election.id}
              className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] hover:border-stone-400 dark:hover:border-stone-600 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={election.status || 'ACTIVE'} />
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-[#1a4231]/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                    <CheckCircle2 className="w-3 h-3" />
                    Ballot Cast
                  </span>
                  {election.organization && (
                    <span className="text-xs text-stone-500 flex items-center gap-1 font-medium">
                      <Building2 className="w-3 h-3 text-stone-400" />
                      {election.organization}
                    </span>
                  )}
                </div>

                <h2 className="font-serif text-base font-bold text-stone-900 dark:text-white truncate">
                  {election.title}
                </h2>

                <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    {election.start_datetime ? new Date(election.start_datetime).toLocaleDateString() : 'N/A'} – {election.end_datetime ? new Date(election.end_datetime).toLocaleDateString() : 'N/A'}
                  </span>
                  <span className="font-mono text-[11px] text-stone-400">
                    ID: {election.id.slice(0, 8)}...
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                <Link
                  to={`/elections/${election.id}/results`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 dark:bg-[#101216] dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 transition-colors"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Results</span>
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

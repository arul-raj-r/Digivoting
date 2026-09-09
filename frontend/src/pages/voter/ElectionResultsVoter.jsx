import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import votingApi from '../../api/voting';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ErrorState from '../../components/common/ErrorState';
import { 
  Trophy, 
  AlertTriangle, 
  ArrowLeft, 
  Clock, 
  Scale, 
  Lock,
  User,
  RefreshCw
} from 'lucide-react';

export default function ElectionResultsVoter() {
  const { id } = useParams();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notAvailable, setNotAvailable] = useState(false);

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    setNotAvailable(false);
    try {
      const data = await votingApi.getResults(id);
      if (!data || data.available === false || !data.is_published) {
        setNotAvailable(true);
      } else {
        setResults(data);
      }
    } catch (err) {
      const status = err.response?.status;
      if (status === 404 || status === 403) {
        setNotAvailable(true);
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to load election results.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        <LoadingSkeleton variant="header" />
        <LoadingSkeleton variant="metrics" count={3} />
        <LoadingSkeleton variant="table" count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <ErrorState 
          title="Results tabulation unavailable"
          message={error}
          onRetry={fetchResults}
        />
      </div>
    );
  }

  if (notAvailable || !results) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6">
        <Link 
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Member Dashboard</span>
        </Link>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
            Results Not Yet Published
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Official ballot tabulation and certification for this contest are in progress, or results have not yet been published by the organizer. Please check back later.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={fetchResults}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Check Again</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isTied = !!results.tie;
  const isSmallElectorate = !!results.small_electorate_disclaimer;
  const candidates = results.results || [];
  const winner = results.winner;
  const tiedCandidates = results.tied_candidates || [];
  const turnout = results.turnout || {
    total_ballots_cast: results.total_ballots_cast || 0,
    total_eligible_voters: 0,
    turnout_percentage: 0,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      
      {/* Navigation */}
      <div>
        <Link 
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Member Dashboard</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Official Certified Results
              </span>
              <span className="text-xs text-slate-400">
                Published {results.published_at ? new Date(results.published_at).toLocaleDateString() : 'Recently'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Election Results
            </h1>
          </div>
        </div>

        {/* Turnout Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 block text-[11px]">Total Ballots Cast</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white">
              {turnout.total_ballots_cast}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 block text-[11px]">Eligible Members</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white">
              {turnout.total_eligible_voters}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 block text-[11px]">Member Turnout Rate</span>
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
              {turnout.turnout_percentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Small Electorate Disclaimer Notice (<10 ballots) */}
      {isSmallElectorate && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Small Electorate Privacy Notice (&lt;10 Ballots Cast)</p>
            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
              {results.small_electorate_disclaimer}
            </p>
          </div>
        </div>
      )}

      {/* Outcome / Winner Card or Tied Contest Card */}
      {isTied ? (
        <div className="bg-amber-500/10 border-2 border-amber-400 dark:border-amber-600 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
            <Scale className="w-5 h-5" />
            <span>Contest Ended in a Tie (Equality of Votes)</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            The certified tally produced exact vote parity between the leading candidates. Organizational tie-breaking bylaws apply.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {tiedCandidates.map(c => (
              <div key={c.candidate_id} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-300 dark:border-amber-700">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">{c.full_name}</span>
                <span className="text-[11px] text-slate-500 block">{c.party_or_affiliation || 'General'}</span>
                <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 mt-1 block">
                  {c.vote_count} votes ({c.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : winner ? (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Elected / Certified Winner
              </span>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                {winner.full_name}
              </h2>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {winner.party_or_affiliation || 'General Nominee'}
              </p>
            </div>
          </div>
          <div className="sm:text-right shrink-0">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block">
              {winner.percentage}%
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {winner.vote_count} total votes
            </span>
          </div>
        </div>
      ) : null}

      {/* Candidate Breakdown Table & Bars */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-5 transition-colors">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Candidate Vote Breakdown
        </h2>

        <div className="space-y-4">
          {candidates.map(candidate => {
            const isCandidateWinner = winner?.candidate_id === candidate.candidate_id;
            const isCandidateTied = tiedCandidates.some(t => t.candidate_id === candidate.candidate_id);

            return (
              <div key={candidate.candidate_id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {candidate.photo_url ? (
                      <img src={candidate.photo_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <User className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {candidate.full_name}
                    </span>
                    <span className="text-slate-400 font-normal">
                      ({candidate.party_or_affiliation || 'General'})
                    </span>
                    {isCandidateWinner && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        Winner
                      </span>
                    )}
                    {isCandidateTied && (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                        Tied
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {candidate.vote_count} votes
                    </span>
                    <span className="text-slate-400 ml-1.5 font-medium">
                      ({candidate.percentage}%)
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCandidateWinner
                        ? 'bg-emerald-500'
                        : isCandidateTied
                        ? 'bg-amber-500'
                        : 'bg-sky-600 dark:bg-sky-500'
                    }`}
                    style={{ width: `${Math.max(candidate.percentage, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

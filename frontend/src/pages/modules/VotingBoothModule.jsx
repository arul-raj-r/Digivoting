import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import electionApi from '../../services/electionApi';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ErrorState from '../../components/common/ErrorState';
import { 
  Vote, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle,
  Lock,
  Sparkles
} from 'lucide-react';

export default function VotingBoothModule() {
  const navigate = useNavigate();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchElections = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await electionApi.getVoterOverview();
        const list = Array.isArray(data) ? data : (data.elections || data.results || []);
        setElections(list);
      } catch (err) {
        console.error('Failed to load voter elections:', err);
        setError(err.response?.data?.error || err.message || 'Unable to connect to election registry.');
      } finally {
        setLoading(false);
      }
    };
    fetchElections();
  }, []);

  const activeElections = elections.filter(e => e.status === 'active');
  const otherElections = elections.filter(e => e.status !== 'active');

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-600/20 flex items-center justify-center">
            <Vote className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              MODULE 5: CONFIDENTIAL VOTING BOOTH
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Official Voting Booth Directory
            </h1>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed">
          Select an active contest below to verify voter credentials and cast an anonymous, cryptographically blinded ballot.
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <LoadingSkeleton variant="header" />
          <LoadingSkeleton variant="cards" count={3} />
        </div>
      ) : error ? (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 max-w-md mx-auto">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Unable to Load Ballots</h3>
            <p className="text-xs text-slate-500 mt-1">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500"
          >
            Retry Connection
          </button>
        </div>
      ) : elections.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3 max-w-md mx-auto">
          <Clock className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Elections Available</h3>
          <p className="text-xs text-slate-500">
            You are not registered on any active election rolls at this time.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Active Ballots Ready to Vote */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Active Contests ({activeElections.length})
              </h2>
            </div>

            {activeElections.length === 0 ? (
              <p className="text-xs text-slate-400">No contests currently open for voting.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activeElections.map((election) => (
                  <div
                    key={election.id}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm depth-card flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          ● OPEN FOR VOTING
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {election.election_type}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                        {election.title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {election.description || 'Secure institutional balloting.'}
                      </p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>Your Status:</span>
                        <span className={election.has_voted ? 'font-bold text-emerald-600' : 'font-semibold text-amber-600'}>
                          {election.has_voted ? '✓ Vote Recorded' : 'Pending Vote'}
                        </span>
                      </div>

                      {election.has_voted ? (
                        <Link
                          to={`/results?election=${election.id}`}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <span>View Certified Results</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <Link
                          to={`/elections/${election.id}/vote`}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-center text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Vote className="w-3.5 h-3.5" />
                          <span>Enter Voting Booth</span>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Concluded / Scheduled Ballots */}
          {otherElections.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Upcoming & Concluded Contests ({otherElections.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {otherElections.map((election) => (
                  <div
                    key={election.id}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 opacity-80"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {election.status}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {election.election_type}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                        {election.title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {election.description || 'Ballot registration closed.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                      {election.status === 'completed' ? (
                        <Link
                          to={`/results?election=${election.id}`}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <span>Review Tally</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <div className="text-xs text-slate-400 text-center py-2">
                          Polls not yet open
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

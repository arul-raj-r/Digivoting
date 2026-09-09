import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import electionApi from '../../services/electionApi';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ErrorState from '../../components/common/ErrorState';
import { 
  Vote, 
  PlusCircle, 
  UserCheck, 
  BarChart2, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Calendar,
  RefreshCw,
  Award,
  Building2,
  Check,
  AlertCircle,
  ExternalLink,
  Layers,
  Shield,
  Lock
} from 'lucide-react';

export default function VoterDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.full_name || user?.name || user?.email?.split('@')[0] || 'User';

  const [createdElections, setCreatedElections] = useState([]);
  const [voterElections, setVoterElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch elections created by this user
      const createdPromise = electionApi.getElections()
        .then((data) => (Array.isArray(data) ? data : data?.results || []))
        .catch((err) => {
          console.warn('Could not load created elections:', err);
          return [];
        });

      // 2. Fetch voter-overview (roster presence and eligibility)
      const voterPromise = electionApi.getVoterOverview()
        .then((data) => (Array.isArray(data) ? data : data?.results || []))
        .catch(async () => {
          // Fallback to voter eligible elections
          try {
            const fallback = await electionApi.getVoterEligibleElections();
            return (fallback?.elections || []).map(e => ({
              ...e,
              is_eligible: true,
              already_voted: e.has_voted
            }));
          } catch (e) {
            return [];
          }
        });

      const [createdRes, voterRes] = await Promise.all([createdPromise, voterPromise]);
      setCreatedElections(createdRes);
      setVoterElections(voterRes);
    } catch (err) {
      console.error('Failed to load unified dashboard:', err);
      setError('Unable to load dashboard data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Compute Creator Activity KPI metrics
  const creatorCounts = {
    total: createdElections.length,
    draft: createdElections.filter(e => (e.status || '').toLowerCase() === 'draft').length,
    scheduled: createdElections.filter(e => (e.status || '').toLowerCase() === 'scheduled').length,
    live: createdElections.filter(e => ['active', 'live'].includes((e.status || '').toLowerCase())).length,
    paused: createdElections.filter(e => (e.status || '').toLowerCase() === 'paused').length,
    completed: createdElections.filter(e => (e.status || '').toLowerCase() === 'completed').length,
  };

  // Compute Voter Activity KPI metrics
  const eligibleVoterList = voterElections.filter(e => e.is_eligible || e.is_eligible === undefined);
  const voterCounts = {
    eligible: eligibleVoterList.length,
    activeNow: eligibleVoterList.filter(e => ['active', 'live'].includes((e.status || '').toLowerCase()) && !e.already_voted && !e.has_voted).length,
    upcoming: eligibleVoterList.filter(e => ['scheduled', 'configured'].includes((e.status || '').toLowerCase())).length,
    voted: eligibleVoterList.filter(e => e.already_voted || e.has_voted).length,
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-12">
        <LoadingSkeleton variant="header" />
        <LoadingSkeleton variant="metrics" count={4} />
        <LoadingSkeleton variant="cards" count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 max-w-lg mx-auto">
        <ErrorState
          title="Unable to load dashboard"
          message={error}
          onRetry={loadDashboardData}
        />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-16">
      {/* ========================================================= */}
      {/* UNIFIED WELCOME BANNER & PLATFORM SUMMARY                 */}
      {/* ========================================================= */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
              UNIFIED PLATFORM WORKSPACE
            </span>
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Welcome, {displayName}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
            You have full access to create & manage organizational elections, upload voter rosters, and participate as a verified voter across all eligible contests.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={loadDashboardData}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Refresh dashboard"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/available-elections"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all"
          >
            <Vote className="w-4 h-4 text-emerald-500" />
            <span>Available Elections</span>
          </Link>
          <Link
            to="/elections/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Election</span>
          </Link>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CONTEXT 1: MY ELECTION ACTIVITY (CREATOR SECTION)          */}
      {/* ========================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>My Election Activity</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  Elections you created & manage
                </span>
              </h2>
            </div>
          </div>

          <Link
            to="/elections"
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <span>View all my elections ({creatorCounts.total})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Creator KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Created Total</span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{creatorCounts.total}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider font-mono">Draft</span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{creatorCounts.draft}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider font-mono">Scheduled</span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{creatorCounts.scheduled}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider font-mono">Live Now</span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{creatorCounts.live}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-semibold text-orange-500 uppercase tracking-wider font-mono">Paused</span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{creatorCounts.paused}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-semibold text-purple-500 uppercase tracking-wider font-mono">Completed</span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{creatorCounts.completed}</div>
          </div>
        </div>

        {/* Recent Created Elections Cards */}
        {createdElections.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-white dark:bg-[#0d1527] border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <PlusCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No elections created yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              You haven't set up any elections yet. Start organizing by creating your first digital voting contest.
            </p>
            <Link
              to="/elections/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Your First Election</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {createdElections.slice(0, 3).map((el) => (
              <div
                key={el.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-indigo-500/40 transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={el.status} />
                    <span className="text-[10px] text-slate-400 font-mono capitalize">
                      {el.election_type || 'Standard'}
                    </span>
                  </div>
                  <div>
                    <Link
                      to={`/elections/${el.id}`}
                      className="text-sm font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 block line-clamp-1"
                    >
                      {el.title || el.name}
                    </Link>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {el.description || 'No description added.'}
                    </p>
                  </div>
                  {el.organization && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                      <Building2 className="w-3 h-3" />
                      <span>{el.organization}</span>
                    </span>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-mono">
                    ID: {el.id.slice(0, 8)}...
                  </span>
                  <Link
                    to={`/elections/${el.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                  >
                    <span>Manage Workspace</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Visual Separator */}
      <div className="border-t border-slate-200/80 dark:border-slate-800" />

      {/* ========================================================= */}
      {/* CONTEXT 2: MY VOTING ACTIVITY (VOTER SECTION)             */}
      {/* ========================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Vote className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>My Voting Activity</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  Elections where you can participate
                </span>
              </h2>
            </div>
          </div>

          <Link
            to="/available-elections"
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>View all available ({voterCounts.eligible})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Voter KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Eligible To Vote</span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{voterCounts.eligible}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider font-mono">Active & Ready</span>
            <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{voterCounts.activeNow}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider font-mono">Upcoming</span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{voterCounts.upcoming}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm">
            <span className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider font-mono">Ballots Cast</span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{voterCounts.voted}</div>
          </div>
        </div>

        {/* Eligible Voter Elections List */}
        {eligibleVoterList.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-white dark:bg-[#0d1527] border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <Vote className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No eligible elections assigned</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Your email (<span className="font-mono text-slate-700 dark:text-slate-300">{user?.email}</span>) is not yet listed on any published election roster. When an election creator adds you to an eligible voter roster, it will appear here immediately.
            </p>
            <Link
              to="/available-elections"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <span>Browse All Published Contests</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eligibleVoterList.slice(0, 3).map((el) => {
              const isLive = ['active', 'live'].includes((el.status || '').toLowerCase());
              const hasVoted = Boolean(el.already_voted || el.has_voted);
              const isVerified = el.verification_status === 'verified';

              return (
                <div
                  key={el.id}
                  className="p-5 rounded-2xl bg-white dark:bg-[#0d1527] border border-emerald-500/20 dark:border-emerald-950/50 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition-all"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <StatusBadge status={el.status} />
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3" />
                        Eligible
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                        {el.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {el.description || 'Review candidates and submit vote.'}
                      </p>
                    </div>
                    {el.organization && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>{el.organization}</span>
                      </span>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      {hasVoted ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Ballot Cast
                        </span>
                      ) : (
                        <span className="text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {isLive ? 'Voting Active' : 'Pending Start'}
                        </span>
                      )}
                    </div>

                    {!hasVoted ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/elections/${el.id}/participate`)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                          isLive
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span>{isLive ? 'Vote Now' : 'Verify'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <Link
                        to={`/results?electionId=${el.id}`}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        View Results
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

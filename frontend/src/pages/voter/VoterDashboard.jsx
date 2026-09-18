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
  BarChart2, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Calendar,
  RefreshCw,
  Building2,
  Check,
  AlertCircle,
  Layers,
  FileText,
  Lock
} from 'lucide-react';

export default function VoterDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.full_name || user?.name || user?.email?.split('@')[0] || 'Citizen';

  const [activeTab, setActiveTab] = useState('voter'); // 'voter' | 'creator'
  const [createdElections, setCreatedElections] = useState([]);
  const [voterElections, setVoterElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch elections created by this user
      const createdPromise = electionApi.getElections()
        .then((data) => {
          if (Array.isArray(data)) return data;
          if (Array.isArray(data?.elections)) return data.elections;
          if (Array.isArray(data?.results)) return data.results;
          return [];
        })
        .catch((err) => {
          console.warn('Could not load created elections:', err);
          return [];
        });

      // 2. Fetch voter-overview (roster presence and eligibility)
      const voterPromise = electionApi.getVoterOverview()
        .then((data) => {
          if (Array.isArray(data)) return data;
          if (Array.isArray(data?.elections)) return data.elections;
          if (Array.isArray(data?.results)) return data.results;
          return [];
        })
        .catch(async () => {
          try {
            const fallback = await electionApi.getVoterEligibleElections();
            const list = fallback?.elections || fallback?.results || (Array.isArray(fallback) ? fallback : []);
            return list.map(e => ({
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
      setError('Unable to load election data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Compute metrics
  const eligibleVoterList = voterElections.filter(e => e.is_eligible || e.is_eligible === undefined);
  const totalVotesCast = eligibleVoterList.filter(e => e.already_voted || e.has_voted).length;
  const completedCount = eligibleVoterList.filter(e => (e.status || '').toLowerCase() === 'completed').length;

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
    <div className="space-y-8 pb-16 font-sans">
      
      {/* ========================================================= */}
      {/* HERO SECTION: WELCOME & PLATFORM CTAS                     */}
      {/* ========================================================= */}
      <div className="p-6 sm:p-8 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-[#1a4231]/40 px-2.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
              Institutional Account
            </span>
            <span className="text-xs text-stone-500 font-mono">
              {user?.email}
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            Welcome back, {displayName}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            Access your verified ballots, participate in active institutional elections, and administer created election workspaces.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={loadDashboardData}
            className="p-2.5 rounded-lg border border-stone-300 dark:border-[#262a33] text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-[#101216] transition-colors"
            title="Refresh dashboard"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/available-elections"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-stone-300 dark:border-[#262a33] text-stone-800 dark:text-stone-200 text-xs font-semibold hover:bg-stone-50 dark:hover:bg-[#101216] transition-colors"
          >
            <Vote className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Available elections</span>
          </Link>
          <Link
            to="/elections/create"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#101216] hover:bg-[#171a20] dark:bg-[#1a4231] dark:hover:bg-[#1f4f3b] text-white text-xs font-semibold transition-colors border border-[#262a33] dark:border-emerald-700/40"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create election</span>
          </Link>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4 CORE STATS (Civic Editorial Grid)                       */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Eligible to vote
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">
            {eligibleVoterList.length}
          </div>
          <p className="text-[11px] text-stone-500">Authorized on voter roster</p>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Created by you
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">
            {createdElections.length}
          </div>
          <p className="text-[11px] text-stone-500">Administered election charters</p>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Votes cast
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-emerald-700 dark:text-emerald-400">
            {totalVotesCast}
          </div>
          <p className="text-[11px] text-stone-500">Confidential ballots submitted</p>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Completed contests
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">
            {completedCount}
          </div>
          <p className="text-[11px] text-stone-500">Certified public tallies</p>
        </div>

      </div>

      {/* ========================================================= */}
      {/* SEGMENTED TAB NAVIGATION                                  */}
      {/* ========================================================= */}
      <div className="border-b border-stone-200 dark:border-[#262a33] flex items-center justify-between">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('voter')}
            className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'voter'
                ? 'border-emerald-700 dark:border-emerald-500 text-stone-900 dark:text-white'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            <Vote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Available to vote</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-stone-100 dark:bg-[#101216] text-stone-600 dark:text-stone-400">
              {eligibleVoterList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('creator')}
            className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'creator'
                ? 'border-emerald-700 dark:border-emerald-500 text-stone-900 dark:text-white'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
            }`}
          >
            <Layers className="w-4 h-4 text-stone-500" />
            <span>Created by you</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-stone-100 dark:bg-[#101216] text-stone-600 dark:text-stone-400">
              {createdElections.length}
            </span>
          </button>
        </div>

        {activeTab === 'voter' ? (
          <Link
            to="/available-elections"
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 pb-3"
          >
            <span>View all ({voterElections.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <Link
            to="/elections"
            className="text-xs font-semibold text-stone-700 dark:text-stone-300 hover:underline flex items-center gap-1 pb-3"
          >
            <span>Manage workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: AVAILABLE TO VOTE                                  */}
      {/* ========================================================= */}
      {activeTab === 'voter' && (
        <section className="space-y-4">
          {voterElections.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-[#1a4231]/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Vote className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-base font-bold text-stone-900 dark:text-white">
                No active voting rosters
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 max-w-md mx-auto leading-relaxed">
                Your registered email is not currently listed on any active election rosters. When an institution uploads an authorized roster including your email, your ballot will appear here.
              </p>
              <div className="pt-2">
                <Link
                  to="/available-elections"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-stone-300 dark:border-[#262a33] text-xs font-semibold hover:bg-stone-50 dark:hover:bg-[#101216]"
                >
                  <span>Browse all published contests</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {voterElections.map((el) => {
                const isLive = ['active', 'live'].includes((el.status || '').toLowerCase());
                const isScheduled = (el.status || '').toLowerCase() === 'scheduled';
                const isCompleted = (el.status || '').toLowerCase() === 'completed';
                const hasVoted = Boolean(el.already_voted || el.has_voted);
                const isEligible = el.is_eligible !== false;

                return (
                  <div
                    key={el.id}
                    className="p-5 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-600/40 dark:hover:border-emerald-500/40 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge status={el.status} />
                        {isEligible && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-[#1a4231]/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                            <CheckCircle2 className="w-3 h-3" />
                            Eligible
                          </span>
                        )}
                      </div>

                      <div>
                        <Link
                          to={`/election/${el.id}`}
                          className="font-serif text-base font-bold text-stone-900 dark:text-stone-100 hover:text-emerald-700 dark:hover:text-emerald-400 block line-clamp-1"
                        >
                          {el.title}
                        </Link>
                        <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 mt-1 leading-relaxed">
                          {el.description || 'Institutional contest. Verify candidate positions before casting ballot.'}
                        </p>
                      </div>

                      {el.organization && (
                        <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>{el.organization}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-stone-100 dark:border-[#262a33] flex items-center justify-between text-xs">
                      <div>
                        {hasVoted ? (
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            Ballot cast
                          </span>
                        ) : isCompleted ? (
                          <span className="text-stone-500">Concluded</span>
                        ) : (
                          <span className="text-stone-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                            <span>{formatDate(el.start_datetime)}</span>
                          </span>
                        )}
                      </div>

                      <div>
                        {hasVoted ? (
                          <Link
                            to="/voting-history"
                            className="text-xs font-semibold text-stone-600 dark:text-stone-400 hover:underline"
                          >
                            Receipt
                          </Link>
                        ) : isCompleted ? (
                          <Link
                            to={`/elections/${el.id}/results`}
                            className="text-xs font-semibold text-stone-800 dark:text-stone-200 hover:underline"
                          >
                            Results
                          </Link>
                        ) : isLive && isEligible ? (
                          <Link
                            to={`/election/${el.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1a4231] hover:bg-[#1f4f3b] text-white transition-colors"
                          >
                            <span>Enter election</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        ) : (
                          <Link
                            to={`/election/${el.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-stone-300 dark:border-[#262a33] text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-[#101216]"
                          >
                            <span>Details</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ========================================================= */}
      {/* TAB 2: CREATED BY YOU                                     */}
      {/* ========================================================= */}
      {activeTab === 'creator' && (
        <section className="space-y-4">
          {createdElections.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] space-y-3">
              <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-[#101216] text-stone-600 dark:text-stone-400 flex items-center justify-center mx-auto">
                <PlusCircle className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-base font-bold text-stone-900 dark:text-white">
                No elections created yet
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 max-w-sm mx-auto leading-relaxed">
                You haven't set up any election workspaces under this account yet. Define a charter, upload authorized voter rosters, and start your contest.
              </p>
              <div className="pt-2">
                <Link
                  to="/elections/create"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#101216] hover:bg-[#171a20] dark:bg-[#1a4231] dark:hover:bg-[#1f4f3b] text-white text-xs font-semibold transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Create your first election</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {createdElections.map((el) => (
                <div
                  key={el.id}
                  className="p-5 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] shadow-xs flex flex-col justify-between space-y-4 hover:border-stone-400 dark:hover:border-stone-600 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <StatusBadge status={el.status} />
                      <span className="text-[10px] text-stone-400 font-mono capitalize">
                        {el.election_type || 'Standard'}
                      </span>
                    </div>

                    <div>
                      <Link
                        to={`/elections/${el.id}`}
                        className="font-serif text-base font-bold text-stone-900 dark:text-stone-100 hover:text-emerald-700 dark:hover:text-emerald-400 block line-clamp-1"
                      >
                        {el.title || el.name}
                      </Link>
                      <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 mt-1 leading-relaxed">
                        {el.description || 'No description provided.'}
                      </p>
                    </div>

                    {el.organization && (
                      <div className="flex items-center gap-1.5 text-xs text-stone-500">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{el.organization}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-stone-100 dark:border-[#262a33] flex items-center justify-between text-xs">
                    <span className="text-[11px] text-stone-400 font-mono">
                      ID: {el.id.slice(0, 8)}...
                    </span>
                    <Link
                      to={`/elections/${el.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 dark:bg-[#101216] dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 transition-colors"
                    >
                      <span>Manage</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Trust & Integrity Guarantee Footer Banner */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>All cast ballots are decoupled from voter identities to guarantee vote confidentiality.</span>
        </div>
        <Link to="/security" className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold text-[11px] hidden sm:inline">
          View Security Standards
        </Link>
      </div>

    </div>
  );
}

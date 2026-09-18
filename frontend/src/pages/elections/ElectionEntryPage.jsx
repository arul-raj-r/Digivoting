import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/api';
import { 
  Shield, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  Users, 
  Vote, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  FileText, 
  Building2, 
  LogIn, 
  Settings,
  BarChart3,
  Loader2,
  RefreshCw
} from 'lucide-react';

export default function ElectionEntryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchElection() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/elections/${id}/`);
        if (isMounted) {
          setElection(res.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.error || 
            err.response?.data?.message || 
            'Election details could not be loaded. Please verify the link or QR code.'
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (id) {
      fetchElection();
    }
    return () => { isMounted = false; };
  }, [id, isAuthenticated]);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'TBD';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f5f0] dark:bg-[#101216] flex flex-col items-center justify-center p-6 text-stone-600 dark:text-stone-300">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
        <p className="text-sm font-medium">Verifying election parameters...</p>
      </div>
    );
  }

  if (error || !election) {
    return (
      <div className="min-h-screen bg-[#f7f5f0] dark:bg-[#101216] flex flex-col items-center justify-center p-6 text-stone-800 dark:text-stone-200">
        <div className="max-w-md w-full bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] rounded-xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-xl font-bold">Election Not Available</h1>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            {error || 'The requested election does not exist, is in unpublished draft mode, or access has been restricted.'}
          </p>
          <div className="pt-2">
            <Link
              to={isAuthenticated ? '/dashboard' : '/'}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#101216] text-white dark:bg-[#1a4231] text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <span>Return to platform</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isLive = election.status === 'active';
  const isScheduled = election.status === 'scheduled';
  const isCompleted = election.status === 'completed';
  const isCreator = election.is_creator || (user && election.created_by === user.id);
  const isEligible = election.is_eligible;
  const hasVoted = election.already_voted;

  return (
    <div className="min-h-screen bg-[#f7f5f0] dark:bg-[#101216] text-[#101216] dark:text-[#f7f5f0] transition-colors">
      
      {/* Institutional Nav Header */}
      <header className="border-b border-stone-200 dark:border-[#262a33] bg-white/80 dark:bg-[#171a20]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#1a4231] text-emerald-300 flex items-center justify-center font-bold border border-emerald-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-serif font-bold text-lg text-stone-900 dark:text-white">
                DigiVote
              </span>
              <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 dark:bg-[#101216] text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-[#262a33] uppercase">
                Official Ballot
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="text-xs font-semibold text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white px-3 py-1.5 rounded-lg border border-stone-300 dark:border-[#262a33]"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to={`/login?returnUrl=/election/${id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#101216] hover:bg-[#171a20] dark:bg-[#1a4231] dark:hover:bg-[#1f4f3b] text-white px-3.5 py-1.5 rounded-lg transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign in</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        
        {/* Top Status Banner & Title */}
        <div className="bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] rounded-xl p-6 sm:p-8 shadow-xs space-y-5">
          
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${
                isLive 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' 
                  : isScheduled
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                  : 'bg-stone-100 text-stone-800 dark:bg-stone-800/80 dark:text-stone-300 border border-stone-300 dark:border-stone-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : isScheduled ? 'bg-amber-500' : 'bg-stone-400'}`} />
                {isLive ? 'Live voting open' : isScheduled ? 'Scheduled election' : 'Concluded'}
              </span>

              {election.organization && (
                <span className="inline-flex items-center gap-1 text-xs text-stone-600 dark:text-stone-400">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{election.organization}</span>
                </span>
              )}
            </div>

            <div className="text-xs font-mono text-stone-500">
              ID: {id.slice(0, 8)}...
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {election.title}
            </h1>
            {election.description && (
              <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 leading-relaxed max-w-3xl">
                {election.description}
              </p>
            )}
          </div>

          {/* Voting Schedule Information Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-stone-100 dark:border-[#262a33]">
            <div className="flex items-center gap-2.5 text-xs text-stone-600 dark:text-stone-400">
              <Calendar className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="font-medium text-stone-800 dark:text-stone-200">Start:</span>{' '}
                {formatDate(election.start_datetime)}
              </div>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-stone-600 dark:text-stone-400">
              <Clock className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="font-medium text-stone-800 dark:text-stone-200">End:</span>{' '}
                {formatDate(election.end_datetime)}
              </div>
            </div>
          </div>

        </div>

        {/* PRIMARY CALL TO ACTION CARD */}
        <div className="bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] rounded-xl p-6 sm:p-8 shadow-xs">
          
          {/* CASE 1: USER IS NOT AUTHENTICATED */}
          {!isAuthenticated && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-[#101216] border border-stone-200 dark:border-[#262a33] flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-stone-600 dark:text-stone-300" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-stone-900 dark:text-white">
                    Authentication Required to Vote
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                    To maintain strict ballot integrity and prevent duplicate voting, you must authenticate with your institutional account. You will return directly to this ballot.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  to={`/login?returnUrl=/election/${id}`}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#101216] hover:bg-[#171a20] dark:bg-[#1a4231] dark:hover:bg-[#1f4f3b] text-white text-xs font-semibold transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign in to verify eligibility</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  to={`/register?returnUrl=/election/${id}`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-stone-300 dark:border-[#262a33] text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-[#101216] text-xs font-semibold transition-colors"
                >
                  <span>Create new voter account</span>
                </Link>
              </div>
            </div>
          )}

          {/* CASE 2: CREATOR MANAGEMENT NOTICE (Does not block voter eligibility flow) */}
          {isAuthenticated && isCreator && (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Settings className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                    Election Administration Notice
                  </h3>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                    You are the creator of this election. You can monitor participation and manage configurations in your Control Center.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 shrink-0">
                <Link
                  to={`/elections/${id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#101216] dark:bg-[#1a4231] text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Control Center</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
                {isCompleted && (
                  <Link
                    to={`/elections/${id}/results`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-stone-300 dark:border-[#262a33] text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-[#101216] text-xs font-semibold"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Results</span>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* CASE 3: COMPLETED ELECTION */}
          {isAuthenticated && isCompleted && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-stone-100 dark:bg-[#101216] text-stone-600 dark:text-stone-300 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-stone-900 dark:text-white">
                    This Election Has Concluded
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                    The scheduled voting period has ended. The certified results and final voter participation tallies are available for public inspection.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to={`/elections/${id}/results`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#101216] hover:bg-[#171a20] dark:bg-[#1a4231] dark:hover:bg-[#1f4f3b] text-white text-xs font-semibold transition-colors"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>View certified election results</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* CASE 4: SCHEDULED (UPCOMING) */}
          {isAuthenticated && isScheduled && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-stone-50 dark:bg-[#101216] border border-stone-200 dark:border-[#262a33] space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-stone-800 dark:text-stone-200">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Voting opens on {formatDate(election.start_datetime)}</span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  The ballot is not yet open for voting. When the voting window opens, return to this link or scan your election QR code to cast your ballot.
                </p>
                
                <div className="pt-2">
                  {isEligible ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Your account is confirmed on the authorized voter roster.</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-stone-500 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Roster eligibility check will be finalized by the election organizer.</span>
                    </span>
                  )}
                </div>
              </div>

              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-300 dark:border-[#262a33] text-stone-700 dark:text-stone-300 text-xs font-medium hover:bg-stone-100 dark:hover:bg-[#101216]"
              >
                <span>Return to dashboard</span>
              </Link>
            </div>
          )}

          {/* CASE 5: ACTIVE & ALREADY VOTED */}
          {isAuthenticated && isLive && hasVoted && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-[#1a4231]/30 border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    Ballot Successfully Cast
                  </h3>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5 leading-relaxed">
                    You have already submitted your confidential ballot for this election. To preserve election integrity, ballots cannot be altered or resubmitted.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Link
                  to="/voting-history"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#101216] dark:bg-[#1a4231] text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <FileText className="w-4 h-4" />
                  <span>View voting history receipt</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* CASE 6: ACTIVE & ELIGIBLE -> ENTER VOTING BOOTH */}
          {isAuthenticated && isLive && !hasVoted && isEligible && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#1a4231] text-emerald-300 flex items-center justify-center shrink-0">
                  <Vote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold text-stone-900 dark:text-white">
                    You are eligible to vote
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                    Your institutional identity has been verified on the official voter roster. Enter the confidential voting booth to cast your ballot.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to={`/elections/${id}/vote`}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#1a4231] hover:bg-[#1f4f3b] text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <Vote className="w-4 h-4" />
                  <span>Enter voting booth & cast ballot</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* CASE 7: ACTIVE & NOT ELIGIBLE */}
          {isAuthenticated && isLive && !hasVoted && !isEligible && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-700 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-semibold text-rose-900 dark:text-rose-200">
                    Not on authorized voter roster
                  </h3>
                  <p className="text-xs text-rose-800 dark:text-rose-300 mt-1 leading-relaxed">
                    Your account ({user?.email}) is not registered on the official voter roster for this election. If you believe this is an error, please contact the election administrator to verify your roster eligibility.
                  </p>
                </div>
              </div>

              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-300 dark:border-[#262a33] text-stone-700 dark:text-stone-300 text-xs font-medium"
              >
                <span>Return to dashboard</span>
              </Link>
            </div>
          )}

        </div>

        {/* SECURITY & BALLOT SECRECY STANDARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-[#1a4231]/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
              Roster verified
            </h4>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">
              Only authorized members on the institution's official roster can cast ballots.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-[#1a4231]/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
              Secret ballot
            </h4>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">
              Voter identities are strictly decoupled from cast candidate choices to guarantee total secrecy.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-[#1a4231]/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
              Tamper evident
            </h4>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">
              Every vote updates immutable audit tallies preventing any duplicate or fraudulent submissions.
            </p>
          </div>
        </div>

      </main>

      {/* Institutional Footer */}
      <footer className="border-t border-stone-200 dark:border-[#262a33] py-6 text-center text-xs text-stone-500 dark:text-stone-400">
        <p>&copy; {new Date().getFullYear()} DigiVote Platform &middot; Certified Digital Voting Infrastructure</p>
      </footer>

    </div>
  );
}

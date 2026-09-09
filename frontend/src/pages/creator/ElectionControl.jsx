import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import electionsApi from '../../api/elections';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ErrorState from '../../components/common/ErrorState';
import { 
  PlayCircle, 
  PauseCircle,
  Play,
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft, 
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  Lock,
  FileCheck2,
  RefreshCw
} from 'lucide-react';

export default function ElectionControl() {
  const { id } = useParams();
  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [voterCount, setVoterCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dialog states
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [stopReason, setStopReason] = useState('');

  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [processing, setProcessing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [electionData, candidatesData, votersData] = await Promise.all([
        electionsApi.getElection(id),
        electionsApi.getCandidates(id),
        electionsApi.getEligibleVoters(id),
      ]);
      setElection(electionData);
      setCandidates(candidatesData.candidates || candidatesData || []);
      setVoterCount(votersData.total_count ?? (votersData.voters?.length || votersData.length || 0));
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load election control parameters.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        <LoadingSkeleton variant="header" />
        <LoadingSkeleton variant="cards" count={3} />
      </div>
    );
  }

  if (error || !election) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <ErrorState 
          title="Election control unavailable"
          message={error || 'Could not connect to operational control for this election.'}
          onRetry={fetchData}
        />
      </div>
    );
  }

  const candidateCount = candidates.length;
  const isDraft = election.status === 'draft';
  const isConfigured = election.status === 'configured';
  const isScheduled = election.status === 'scheduled';
  const isActive = election.status === 'active';
  const isPaused = election.status === 'paused';
  const isCompleted = election.status === 'completed';
  const isCancelled = election.status === 'cancelled';

  const isLocked = isActive || isPaused || isCompleted || isCancelled || election.is_locked;

  // Pre-flight checklist
  const checks = [
    {
      title: 'Election Title & Description',
      valid: (election.title?.length || 0) >= 3,
      detail: election.title || 'Title missing.'
    },
    {
      title: 'Nominee / Candidate Roster',
      valid: candidateCount >= 1,
      detail: `${candidateCount} candidate${candidateCount === 1 ? '' : 's'} registered (min 1 required).`
    },
    {
      title: 'Eligible Voter Roll',
      valid: voterCount >= 1,
      detail: `${voterCount} eligible voter${voterCount === 1 ? '' : 's'} registered (min 1 required).`
    },
    {
      title: 'Voting Timetable',
      valid: !!election.start_datetime && !!election.end_datetime,
      detail: election.start_datetime ? `Scheduled: ${new Date(election.start_datetime).toLocaleString()}` : 'Dates not configured in Schedule & Rules.'
    },
  ];

  const allChecksPass = checks.every(c => c.valid);
  const canStart = isScheduled && allChecksPass;
  const isEarlyStart = isScheduled && election.start_datetime && (new Date() < new Date(election.start_datetime));

  // Action Handlers
  const handleStart = async () => {
    setProcessing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await electionsApi.startElection(id, { force: isEarlyStart });
      setActionSuccess('Election started successfully and is now active. Configuration is permanently locked.');
      setShowStartDialog(false);
      await fetchData();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to start election.');
    } finally {
      setProcessing(false);
    }
  };

  const handlePause = async () => {
    setProcessing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await electionsApi.pauseElection(id);
      setActionSuccess('Election paused successfully. Voting is temporarily suspended.');
      setShowPauseDialog(false);
      await fetchData();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to pause election.');
    } finally {
      setProcessing(false);
    }
  };

  const handleResume = async () => {
    setProcessing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await electionsApi.resumeElection(id);
      setActionSuccess('Election resumed successfully and is now active.');
      setShowResumeDialog(false);
      await fetchData();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to resume election.');
    } finally {
      setProcessing(false);
    }
  };

  const handleComplete = async () => {
    setProcessing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await electionsApi.completeElection(id);
      setActionSuccess('Election officially completed! Vote tally and integrity audit generated.');
      setShowCompleteDialog(false);
      await fetchData();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to complete election.');
    } finally {
      setProcessing(false);
    }
  };

  const handleStop = async (e) => {
    e.preventDefault();
    if (stopReason.trim().length < 20) {
      setActionError('Emergency stop justification must be at least 20 characters.');
      return;
    }
    setProcessing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await electionsApi.stopElection(id, { reason: stopReason.trim() });
      setActionSuccess('Election has been terminated and cancelled.');
      setShowStopDialog(false);
      await fetchData();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to stop election.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <Link
            to={`/creator/elections/${id}`}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Election Hub
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Operational Lifecycle Control
          </h1>
        </div>
        <StatusBadge status={election.status} />
      </div>

      {/* Action Alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Configuration Lock Banner */}
      {isLocked && (
        <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-amber-900 dark:text-amber-200">
            <p className="font-bold">Configuration Lock Active</p>
            <p className="text-amber-800/80 dark:text-amber-300/80">
              Because this election has reached {election.status.toUpperCase()} status, candidate slates, voter rolls, verification configurations, and rules are permanently locked to guarantee election integrity.
            </p>
          </div>
        </div>
      )}

      {/* Pre-flight Checklist Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Election Launch Readiness Checklist</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {checks.map((check, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                check.valid
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
              }`}
            >
              {check.valid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{check.title}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{check.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lifecycle Operational Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. START ELECTION CARD */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <PlayCircle className="w-5 h-5 text-blue-600" />
              <span>Launch / Start Election</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Transition to <span className="font-bold text-slate-800 dark:text-slate-200">ACTIVE</span>. Opens the polling booth for voters and permanently locks configuration.
            </p>
          </div>

          <div>
            {isActive ? (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Election is currently active & open
              </span>
            ) : isPaused ? (
              <span className="text-xs font-semibold text-amber-600">Election is currently paused</span>
            ) : isCompleted || isCancelled ? (
              <span className="text-xs text-slate-400 italic">Election is concluded</span>
            ) : (
              <button
                type="button"
                disabled={!canStart || processing}
                onClick={() => setShowStartDialog(true)}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Launch Election & Open Booths
              </button>
            )}
          </div>
        </div>

        {/* 2. PAUSE / RESUME CONTROL CARD */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <PauseCircle className="w-5 h-5 text-amber-600" />
              <span>Pause / Resume Control</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Temporarily halt active voting for technical, security, or administrative reasons, and resume whenever ready.
            </p>
          </div>

          <div>
            {isActive ? (
              <button
                type="button"
                disabled={processing}
                onClick={() => setShowPauseDialog(true)}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800 transition"
              >
                Pause Active Voting
              </button>
            ) : isPaused ? (
              <button
                type="button"
                disabled={processing}
                onClick={() => setShowResumeDialog(true)}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
              >
                Resume Active Voting
              </button>
            ) : (
              <span className="text-xs text-slate-400 italic">Pause/Resume available during active status</span>
            )}
          </div>
        </div>

        {/* 3. COMPLETE ELECTION CARD */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <FileCheck2 className="w-5 h-5 text-indigo-600" />
              <span>Complete & Compute Results</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Officially closes voting, permanently seals the election, and executes the automated cryptographic vote tally.
            </p>
          </div>

          <div>
            {isCompleted ? (
              <div className="space-y-2">
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Election Officially Completed
                </span>
                <Link
                  to={`/creator/elections/${id}/results`}
                  className="block text-center w-full py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800"
                >
                  View Computed Results & Tally
                </Link>
              </div>
            ) : (isActive || isPaused) ? (
              <button
                type="button"
                disabled={processing}
                onClick={() => setShowCompleteDialog(true)}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
              >
                Complete Election & Tally Votes
              </button>
            ) : (
              <span className="text-xs text-slate-400 italic">Available once election has started</span>
            )}
          </div>
        </div>

        {/* 4. EMERGENCY CANCEL / STOP CARD */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-950 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-rose-600">
              <ShieldAlert className="w-5 h-5" />
              <span>Emergency Abort Protocol</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Permanently terminates the election due to severe irregularities or administrative order. Requires documented justification.
            </p>
          </div>

          <div>
            {isCancelled ? (
              <span className="text-xs font-bold text-rose-600">
                Emergency Stop Executed (Cancelled)
              </span>
            ) : isCompleted ? (
              <span className="text-xs text-slate-400 italic">Election already concluded normally</span>
            ) : (
              <button
                type="button"
                disabled={processing}
                onClick={() => setShowStopDialog(true)}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-rose-700 dark:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 transition"
              >
                Execute Emergency Stop
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODALS */}
      {/* 1. Start Dialog */}
      {showStartDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-blue-600" />
              <span>Confirm Election Launch</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Launching will open the polling booth for voters. Candidate slates and voter lists will be permanently locked.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowStartDialog(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={handleStart}
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm disabled:opacity-50"
              >
                {processing ? 'Launching...' : 'Confirm & Launch Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Pause Dialog */}
      {showPauseDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-amber-600">
              <PauseCircle className="w-5 h-5" />
              <span>Pause Active Voting?</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Voters will not be able to cast ballots while paused. You can resume active voting at any time.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPauseDialog(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={handlePause}
                className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm disabled:opacity-50"
              >
                {processing ? 'Pausing...' : 'Confirm Pause'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Resume Dialog */}
      {showResumeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-emerald-600">
              <Play className="w-5 h-5" />
              <span>Resume Active Voting?</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Voting will immediately reopen for all eligible voters.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResumeDialog(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={handleResume}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm disabled:opacity-50"
              >
                {processing ? 'Resuming...' : 'Resume Voting'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Complete Dialog */}
      {showCompleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 text-indigo-600">
              <FileCheck2 className="w-5 h-5" />
              <span>Officially Complete Election?</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              This action is permanent and cannot be reversed. Voting will permanently close and the automated cryptographic tally will be generated immediately.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCompleteDialog(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={handleComplete}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm disabled:opacity-50"
              >
                {processing ? 'Completing & Tallying...' : 'Complete & Calculate Tally'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Emergency Stop Dialog */}
      {showStopDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-2xl border border-rose-300 dark:border-rose-900 p-6 space-y-5 shadow-2xl">
            <h3 className="text-base font-extrabold text-rose-600 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              <span>Execute Emergency Stop</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              This action permanently cancels the election. Document your justification below (minimum 20 characters) for audit trail compliance.
            </p>
            <form onSubmit={handleStop} className="space-y-4">
              <textarea
                rows={3}
                value={stopReason}
                onChange={(e) => setStopReason(e.target.value)}
                placeholder="Reason for emergency cancellation..."
                className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>{stopReason.trim().length}/20 characters minimum</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowStopDialog(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={stopReason.trim().length < 20 || processing}
                    className="px-5 py-2 font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl disabled:opacity-40"
                  >
                    {processing ? 'Stopping...' : 'Confirm Emergency Stop'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

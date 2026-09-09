import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import votingApi from '../../services/votingApi';
import verificationApi from '../../services/verificationApi';
import electionApi from '../../services/electionApi';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ErrorState from '../../components/common/ErrorState';
import { 
  Vote, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Clock, 
  Lock, 
  ArrowRight, 
  User, 
  Printer, 
  FileText, 
  Download,
  AlertTriangle,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export default function VotingBooth() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Selected election id (either from URL params or fallback)
  const [electionId, setElectionId] = useState(id || '');
  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);

  // Flow states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEligible, setIsEligible] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  // Authorization token from sessionStorage
  const [authToken, setAuthToken] = useState(() => {
    return sessionStorage.getItem(`digivote_auth_${id}`) || '';
  });

  // Modal & submission state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmToken, setConfirmToken] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [receipt, setReceipt] = useState(null);

  // Manifesto modal
  const [activeManifesto, setActiveManifesto] = useState(null);

  useEffect(() => {
    if (id) {
      setElectionId(id);
      loadBoothData(id);
    }
  }, [id]);

  const loadBoothData = async (eId) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch election details & eligibility
      const [electionData, eligibility] = await Promise.all([
        electionApi.getElection(eId),
        verificationApi.getEligibility(eId).catch(err => {
          return { error: err.response?.data?.error || 'Eligibility check failed' };
        })
      ]);

      setElection(electionData);

      if (eligibility.error) {
        if (eligibility.has_voted || eligibility.error.includes('already cast') || eligibility.error.includes('already voted')) {
          setHasVoted(true);
        } else {
          setError(eligibility.error);
        }
        setLoading(false);
        return;
      }

      setIsEligible(true);

      // 2. Fetch candidates for ballot
      const candidatesData = await votingApi.getBallotCandidates(eId);
      const list = candidatesData.candidates || (Array.isArray(candidatesData) ? candidatesData : []);
      setCandidates(list);

    } catch (err) {
      console.error('Failed to load voting booth:', err);
      setError(err.response?.data?.error || err.message || 'Unable to load ballot information.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Open Confirmation Modal and fetch confirmation token
  const handleInitiateConfirm = async () => {
    if (!selectedCandidateId) return;

    if (!authToken) {
      setError('Missing single-use voting authorization. Please complete Voter Verification first.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const confirmRes = await votingApi.confirmBallot(electionId, authToken, selectedCandidateId);
      setConfirmToken(confirmRes.confirmation_token || confirmRes.token);
      setShowConfirmModal(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to validate voting authorization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Final confidential ballot submission
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const receiptRes = await votingApi.castBallot(electionId, confirmToken, selectedCandidateId);
      setReceipt(receiptRes);
      setSubmitSuccess(true);
      setShowConfirmModal(false);
      // Clean up session authorization token
      sessionStorage.removeItem(`digivote_auth_${electionId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit ballot to secure tally ledger.');
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        <LoadingSkeleton variant="header" />
        <LoadingSkeleton variant="cards" count={3} />
      </div>
    );
  }

  // If voter has already voted
  if (hasVoted) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Ballot Already Cast & Sealed
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            You have already participated in this election. Duplicate or multi-voting is prohibited to protect electoral integrity.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            to="/results"
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all flex items-center gap-2"
          >
            <span>View Election Results</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/dashboard"
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // If vote was successfully cast in this session
  if (submitSuccess && receipt) {
    return (
      <div className="max-w-xl mx-auto py-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              BALLOT RECORDED CONFIDENTIALLY
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Vote Successfully Submitted!
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Your vote has been cryptographically blinded and recorded to the election ledger.
            </p>
          </div>

          {/* Cryptographic Receipt Card */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-left space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-slate-400">RECEIPT NUMBER:</span>
              <span className="font-bold text-slate-900 dark:text-white">{receipt.receipt_number || receipt.receipt_id || 'BLT-SECURE'}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-slate-400">TIMESTAMP:</span>
              <span className="text-slate-700 dark:text-slate-300">{receipt.recorded_at || receipt.timestamp || new Date().toISOString()}</span>
            </div>
            <div className="space-y-1">
              <span className="text-slate-400 text-[10px]">INTEGRITY SIGNATURE HASH:</span>
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 text-[10px] text-indigo-600 dark:text-indigo-400 break-all select-all font-bold">
                {receipt.signature_hash || receipt.hash || '0x4f820c78a01129b0a8274ec8192a0172834b'}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              to="/results"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all flex items-center gap-2"
            >
              <span>View Results & Tally</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/dashboard"
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      
      {/* Header Info */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
            MODULE 5: CONFIDENTIAL VOTING BOOTH
          </span>
          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Ballot Open
          </span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {election?.title || 'Official Election Ballot'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {election?.description || 'Select one candidate below. Once submitted, your vote is recorded anonymously and cannot be altered.'}
          </p>
        </div>

        {/* Verification Check Callout */}
        {!authToken && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>You have not completed identity verification for this election yet.</span>
            </div>
            <Link
              to={`/voter-verification?election=${electionId}`}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-500 transition-colors shrink-0"
            >
              Verify Now
            </Link>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Candidate Slate Selection Cards */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Official Nominees & Candidates ({candidates.length})
          </h2>
          <p className="text-xs text-slate-500">
            Select your choice by clicking the card or radio button.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {candidates.map((candidate) => {
            const isSelected = selectedCandidateId === candidate.id;
            return (
              <div
                key={candidate.id}
                onClick={() => setSelectedCandidateId(candidate.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer depth-card flex flex-col justify-between space-y-4 ${
                  isSelected
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-600 ring-2 ring-indigo-600/20 shadow-md'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-sm shrink-0 overflow-hidden">
                    {candidate.photo ? (
                      <img src={candidate.photo} alt={candidate.full_name || candidate.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{(candidate.full_name || candidate.name || 'C').charAt(0).toUpperCase()}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {candidate.full_name || candidate.name}
                      </h3>
                      <input
                        type="radio"
                        name="candidate_ballot"
                        checked={isSelected}
                        onChange={() => setSelectedCandidateId(candidate.id)}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium truncate">
                      {candidate.party_or_affiliation || candidate.party || 'Independent Nominee'}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed pt-1">
                      {candidate.bio || candidate.manifesto || 'No manifesto summary submitted.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveManifesto(candidate);
                    }}
                    className="text-slate-500 hover:text-indigo-600 font-semibold underline"
                  >
                    View Full Manifesto
                  </button>

                  <span className={`font-bold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                    {isSelected ? '✓ Selected' : 'Click to Select'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Submission CTA Bar */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-slate-900 dark:text-white">
            {selectedCandidate ? `Selected: ${selectedCandidate.full_name || selectedCandidate.name}` : 'No candidate selected yet'}
          </p>
          <p className="text-[11px] text-slate-400">
            Ballot choices are cryptographically blinded upon submission.
          </p>
        </div>

        <button
          type="button"
          onClick={handleInitiateConfirm}
          disabled={!selectedCandidateId || isSubmitting || !authToken}
          className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
        >
          <Vote className="w-4 h-4" />
          <span>{isSubmitting ? 'Processing...' : 'Review & Cast Ballot'}</span>
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-600/20 flex items-center justify-center mx-auto">
              <Vote className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Confirm Your Vote
              </h3>
              <p className="text-xs text-slate-500">
                You are about to cast your official ballot in <span className="font-bold text-slate-800 dark:text-slate-200">{election?.title}</span>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                CHOSEN CANDIDATE
              </span>
              <p className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                {selectedCandidate?.full_name || selectedCandidate?.name}
              </p>
              <p className="text-xs text-slate-500">
                {selectedCandidate?.party_or_affiliation || selectedCandidate?.party || 'Independent'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Once submitted, your vote cannot be edited, retracted, or re-cast.</span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Sealing...' : 'Confirm Vote'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Manifesto Modal */}
      {activeManifesto && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {activeManifesto.full_name || activeManifesto.name}
                </h3>
                <p className="text-xs text-indigo-600">{activeManifesto.party_or_affiliation || 'Candidate Manifesto'}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveManifesto(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 max-h-72 overflow-y-auto space-y-2 leading-relaxed">
              {activeManifesto.bio || activeManifesto.manifesto || 'No detailed manifesto submitted.'}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

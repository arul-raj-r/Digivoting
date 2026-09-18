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
  Printer, 
  FileText, 
  AlertTriangle, 
  Check, 
  X,
  Building2,
  HelpCircle
} from 'lucide-react';

export default function VotingBooth() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

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
  const [copied, setCopied] = useState(false);

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

  const handleInitiateConfirm = async () => {
    if (!selectedCandidateId) return;

    if (!authToken) {
      navigate(`/elections/${electionId}/participate`);
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

  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const receiptRes = await votingApi.castBallot(electionId, confirmToken, selectedCandidateId);
      setReceipt(receiptRes);
      setSubmitSuccess(true);
      setShowConfirmModal(false);
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
      <div className="max-w-4xl mx-auto space-y-6 py-6 font-sans">
        <LoadingSkeleton variant="header" />
        <LoadingSkeleton variant="cards" count={3} />
      </div>
    );
  }

  // If voter has already voted
  if (hasVoted) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-5 font-sans">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-[#1a4231]/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="font-serif text-2xl font-bold text-stone-900 dark:text-white">
            Ballot Already Cast & Sealed
          </h2>
          <p className="text-xs text-stone-600 dark:text-stone-400 max-w-sm mx-auto leading-relaxed">
            You have already participated in this election. To protect electoral integrity, ballots cannot be submitted more than once.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            to="/voting-history"
            className="px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#101216] dark:bg-[#1a4231] shadow-xs transition-colors flex items-center gap-2"
          >
            <span>View voting history receipt</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/dashboard"
            className="px-4 py-2.5 rounded-lg text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-[#171a20] transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // If vote was successfully cast in this session
  if (submitSuccess && receipt) {
    const receiptNumber = receipt.receipt_id || receipt.receipt_number || 'VOTE-RECORDED';
    const ballotReference = receipt.ballot_id || 'SEALED';
    const recordedTimestamp = receipt.timestamp ? new Date(receipt.timestamp).toLocaleString() : new Date().toLocaleString();
    const electionName = receipt.election_title || election?.title || 'Contest';

    return (
      <div className="max-w-xl mx-auto py-8 space-y-6 animate-in fade-in zoom-in-95 duration-200 font-sans">
        <div className="p-8 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] shadow-xs text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-[#1a4231]/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-[#1a4231]/40 px-2.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
              BALLOT RECORDED CONFIDENTIALLY
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white">
              Vote Successfully Cast
            </h2>
            <p className="text-xs text-stone-600 dark:text-stone-400 max-w-md mx-auto">
              Your confidential ballot choice has been decoupled from your voter account and permanently logged in the election tally ledger.
            </p>
          </div>

          {/* Real Backend Receipt Card (Ballot Secrecy Preserved) */}
          <div className="p-5 rounded-lg bg-stone-50 dark:bg-[#101216] border border-stone-200 dark:border-[#262a33] text-left space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-[#262a33]">
              <span className="text-stone-500 text-[11px]">RECEIPT REFERENCE:</span>
              <span className="font-bold text-stone-900 dark:text-white text-xs select-all">{receiptNumber}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-[#262a33]">
              <span className="text-stone-500 text-[11px]">ELECTION:</span>
              <span className="text-stone-800 dark:text-stone-200 text-xs truncate max-w-[200px]">{electionName}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-[#262a33]">
              <span className="text-stone-500 text-[11px]">TIMESTAMP:</span>
              <span className="text-stone-800 dark:text-stone-200 text-xs">{recordedTimestamp}</span>
            </div>
            <div className="space-y-1 pt-1">
              <span className="text-stone-500 text-[10px]">BALLOT RECORD REFERENCE:</span>
              <div className="p-2 rounded bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] text-[11px] text-emerald-800 dark:text-emerald-400 break-all select-all font-bold">
                {ballotReference}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (receiptNumber) {
                  navigator.clipboard?.writeText(receiptNumber);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2500);
                }
              }}
              className="px-4 py-2 rounded-lg text-xs font-semibold border border-stone-300 dark:border-[#262a33] hover:bg-stone-100 dark:hover:bg-[#101216] transition-colors text-stone-700 dark:text-stone-300 flex items-center gap-2 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Copied</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>Copy receipt reference</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-lg text-xs font-semibold border border-stone-300 dark:border-[#262a33] hover:bg-stone-100 dark:hover:bg-[#101216] transition-colors text-stone-700 dark:text-stone-300 flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print receipt</span>
            </button>
            <Link
              to="/voting-history"
              className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-[#1a4231] hover:bg-[#1f4f3b] shadow-xs transition-colors flex items-center gap-2"
            >
              <span>Voting history</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const selectedCandidate = candidates.find(c => c.id === selectedCandidateId);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 font-sans">
      
      {/* Official Electronic Ballot Header */}
      <div className="p-6 sm:p-8 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-[#1a4231]/40 px-2.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
              OFFICIAL BALLOT
            </span>
            {election?.organization && (
              <span className="text-xs font-medium text-stone-600 dark:text-stone-400">
                {election.organization}
              </span>
            )}
          </div>
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Booth Active
          </span>
        </div>

        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white tracking-tight">
            {election?.title || 'Official Election Ballot'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1 max-w-2xl leading-relaxed">
            {election?.description || 'Review candidate choices and cast your confidential ballot. Once submitted, your selection is permanently decoupled from your identity.'}
          </p>
        </div>

        {/* Verification Check Callout */}
        {!authToken && (
          <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400" />
              <span>Identity verification challenge required before submitting ballot.</span>
            </div>
            <Link
              to={`/elections/${electionId}/participate`}
              className="px-3 py-1.5 rounded-lg bg-[#1a4231] hover:bg-[#1f4f3b] text-white font-semibold transition-colors shrink-0 text-center"
            >
              Verify identity to cast ballot
            </Link>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Candidate Slate Selection Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="font-serif text-base font-bold text-stone-900 dark:text-white">
              Candidates ({candidates.length})
            </h2>
            <p className="text-xs text-stone-500">
              Select one candidate to cast your vote.
            </p>
          </div>
          <span className="text-[11px] font-mono text-stone-400 uppercase tracking-wider">
            Single Choice Ballot
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {candidates.map((candidate, idx) => {
            const isSelected = selectedCandidateId === candidate.id;
            const slotNumber = String(idx + 1).padStart(2, '0');
            return (
              <div
                key={candidate.id}
                onClick={() => setSelectedCandidateId(candidate.id)}
                className={`p-4 sm:p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'bg-emerald-50/40 dark:bg-[#1a4231]/20 border-emerald-600 ring-2 ring-emerald-600/30 shadow-xs'
                    : 'bg-white dark:bg-[#171a20] border-stone-200 dark:border-[#262a33] hover:border-stone-300 dark:hover:border-stone-700'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-stone-100 dark:bg-[#101216] border border-stone-200 dark:border-[#262a33] flex items-center justify-center font-bold text-stone-700 dark:text-stone-200 text-sm overflow-hidden">
                      {candidate.photo ? (
                        <img src={candidate.photo} alt={candidate.full_name || candidate.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{(candidate.full_name || candidate.name || 'C').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="absolute -bottom-1 -right-1 text-[9px] font-mono font-bold px-1 rounded bg-stone-900 text-white dark:bg-stone-700">
                      {slotNumber}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-serif text-sm font-bold text-stone-900 dark:text-white truncate">
                        {candidate.full_name || candidate.name}
                      </h3>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-stone-300 dark:border-stone-600'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 truncate">
                      {candidate.party_or_affiliation || candidate.party || 'Independent Nominee'}
                    </p>
                    <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed pt-0.5">
                      {candidate.bio || candidate.manifesto || 'No candidate statement submitted.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-stone-100 dark:border-[#262a33] text-xs">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveManifesto(candidate);
                    }}
                    className="text-stone-500 hover:text-emerald-700 dark:hover:text-emerald-400 font-medium text-[11px]"
                  >
                    View candidate manifesto →
                  </button>

                  <span className={`text-[11px] font-bold ${isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-400'}`}>
                    {isSelected ? 'Selected on ballot' : 'Click to select'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Submission Review Bar */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-0.5 text-center sm:text-left">
          <p className="text-xs font-bold text-stone-900 dark:text-white">
            {selectedCandidate ? (
              <span className="flex items-center gap-1.5 justify-center sm:justify-start">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Selected Candidate: <span className="text-emerald-800 dark:text-emerald-300 font-bold">{selectedCandidate.full_name || selectedCandidate.name}</span></span>
              </span>
            ) : (
              'No candidate selected on ballot'
            )}
          </p>
          <p className="text-[11px] text-stone-500 dark:text-stone-400">
            Ballot choices are cryptographically decoupled and irreversibly sealed upon submission.
          </p>
        </div>

        <button
          type="button"
          onClick={handleInitiateConfirm}
          disabled={!selectedCandidateId || isSubmitting}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-[#1a4231] hover:bg-[#1f4f3b] disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isSubmitting ? 'Securing Ballot...' : !authToken ? 'Verify & Cast Vote' : 'Review & Cast Secret Ballot'}</span>
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] rounded-xl p-6 sm:p-8 max-w-md w-full shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-[#1a4231]/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800/60">
              <Vote className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white">
                Confirm Your Vote
              </h3>
              <p className="text-xs text-stone-500">
                You are about to cast your confidential ballot in <span className="font-bold text-stone-800 dark:text-stone-200">{election?.title}</span>.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-stone-50 dark:bg-[#101216] border border-stone-200 dark:border-[#262a33] text-center space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">
                CHOSEN CANDIDATE
              </span>
              <p className="font-serif text-base font-bold text-emerald-800 dark:text-emerald-300">
                {selectedCandidate?.full_name || selectedCandidate?.name}
              </p>
              <p className="text-xs text-stone-500">
                {selectedCandidate?.party_or_affiliation || selectedCandidate?.party || 'Independent'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Once submitted, your vote cannot be edited, retracted, or re-cast.</span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-[#101216] transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 rounded-lg text-xs font-bold text-white bg-[#1a4231] hover:bg-[#1f4f3b] shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] rounded-xl p-6 max-w-lg w-full shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-[#262a33]">
              <div>
                <h3 className="font-serif text-base font-bold text-stone-900 dark:text-white">
                  {activeManifesto.full_name || activeManifesto.name}
                </h3>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{activeManifesto.party_or_affiliation || 'Candidate Manifesto'}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveManifesto(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-[#101216] transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-stone-600 dark:text-stone-300 max-h-72 overflow-y-auto space-y-2 leading-relaxed">
              {activeManifesto.bio || activeManifesto.manifesto || 'No detailed manifesto submitted.'}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

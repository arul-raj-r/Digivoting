import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { Landmark, Vote, AlertTriangle, CheckCircle2, User, LandmarkIcon, ClipboardCopy } from 'lucide-react';
import { VoterIDCard } from '../components/VoterIDCard';

interface Candidate {
  id: string;
  name: string;
  party_name: string;
  party_logo_url: string | null;
  photo_url: string | null;
  bio: string | null;
  constituency_name: string;
}

interface Election {
  id: string;
  title: string;
  description: string;
}

export const VotingTerminal: React.FC = () => {
  const { id: electionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { voterProfile } = useAuthStore();

  const [election, setElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Voting flow states
  const [cardConfirmed, setCardConfirmed] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [confirmModal, setConfirmModal] = useState(false);
  const [voteReceipt, setVoteReceipt] = useState<{
    receipt_number: string;
    timestamp: string;
    election_title: string;
  } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const fetchTerminalData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch Election details
        const electionRes = await api.get(`/elections/${electionId}/`);
        setElection(electionRes.data);

        // Fetch Candidates (Backend filters automatically by constituency & is_approved)
        const candidatesRes = await api.get(`/elections/candidates/?election_id=${electionId}`);
        setCandidates(candidatesRes.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load voting terminal.');
      } finally {
        setLoading(false);
      }
    };

    if (electionId) {
      fetchTerminalData();
    }
  }, [electionId]);

  const handleCastVoteClick = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setConfirmModal(true);
  };

  const handleConfirmVote = async () => {
    if (!selectedCandidate) return;
    
    setLoading(true);
    setError(null);
    setConfirmModal(false);

    try {
      const response = await api.post('/elections/vote/', {
        candidate_id: selectedCandidate.id
      });
      
      setVoteReceipt(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred while submitting your ballot.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyReceipt = () => {
    if (voteReceipt) {
      navigator.clipboard.writeText(voteReceipt.receipt_number);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  if (loading && !voteReceipt && !confirmModal) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gov-blue border-t-transparent dark:border-gov-gold"></div>
      </div>
    );
  }

  // SUCCESS SCREEN
  if (voteReceipt) {
    return (
      <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-green-50 dark:bg-green-950/20 text-green-600 rounded-full">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-950 dark:text-white">
            Ballot Cast Successfully
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Your vote has been securely recorded on the election ledger.
          </p>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg space-y-4">
          <div className="text-xs font-mono space-y-2">
            <div>
              <span className="block text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider">Election Name</span>
              <span className="font-bold text-slate-900 dark:text-white">{voteReceipt.election_title}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider">Audit Receipt Hash</span>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="font-bold text-gov-blue dark:text-gov-gold break-all text-sm select-all">
                  {voteReceipt.receipt_number}
                </span>
                <button
                  onClick={handleCopyReceipt}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded border border-slate-200 dark:border-slate-700 shrink-0 text-slate-600 dark:text-slate-350"
                  title="Copy to clipboard"
                >
                  <ClipboardCopy className="h-4 w-4" />
                </button>
              </div>
              {copySuccess && (
                <span className="text-[10px] text-green-600 dark:text-green-400 font-bold block mt-1">
                  ✓ Reference copied to clipboard
                </span>
              )}
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider">Timestamp</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {new Date(voteReceipt.timestamp).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/50 rounded text-[10px] text-amber-800 dark:text-amber-300 leading-relaxed">
            <strong>Security Architecture Notice</strong>: This receipt confirms that you cast a vote in this election. It contains **no record** of your candidate selection, preserving the secrecy of your vote.
          </div>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full py-2.5 bg-gov-blue hover:bg-gov-darkblue text-white rounded-lg text-sm font-bold shadow-md transition-all"
        >
          Return to Voter Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <button 
        onClick={() => navigate('/dashboard')}
        className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        ← Return to Dashboard
      </button>

      {/* Election Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm space-y-2">
        <h2 className="text-xl font-extrabold text-slate-950 dark:text-white flex items-center gap-1.5">
          <Vote className="h-5 w-5 text-gov-blue dark:text-gov-gold" />
          Voting Terminal: {election?.title}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Constituency: <strong className="text-slate-900 dark:text-white">{voterProfile?.constituency_name}</strong>
        </p>
        {error && (
          <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 text-xs rounded-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Candidates List / Card confirmation gate */}
      {!cardConfirmed && voterProfile?.voter_id_card ? (
        <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-base font-black text-slate-950 dark:text-white uppercase tracking-wider">
              Polling Booth Identity Verification
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Please visually cross-check and confirm your identity card details before proceeding to the ballot box.
            </p>
          </div>
          
          <VoterIDCard card={voterProfile.voter_id_card} showPrintButton={false} />
          
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
            <button
              onClick={() => setCardConfirmed(true)}
              className="w-full py-2 bg-gov-green hover:bg-emerald-850 text-white rounded text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Yes, this is my card, proceed to vote
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded text-xs font-bold transition-all cursor-pointer text-slate-750 dark:text-slate-300"
            >
              No, go back to dashboard
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Candidates for your constituency
          </h3>

          {candidates.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 text-xs">
              No approved candidates found for your constituency in this election.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {candidates.map((candidate) => (
                <div 
                  key={candidate.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-gov-blue dark:hover:border-gov-gold transition-all shadow-sm"
                >
                  <div className="flex gap-4">
                    {/* Photo Profile */}
                    <div className="w-[80px] h-[100px] bg-slate-100 dark:bg-slate-950 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                      {candidate.photo_url ? (
                        <img src={candidate.photo_url} alt={candidate.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-8 w-8 text-slate-400" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="space-y-2">
                      <div>
                        <h4 className="font-bold text-slate-950 dark:text-white text-base">{candidate.name}</h4>
                        <span className="inline-flex items-center gap-1 text-[10px] bg-gov-blue/15 text-gov-blue dark:bg-gov-gold/10 dark:text-gov-gold font-bold px-2 py-0.5 rounded uppercase mt-0.5">
                          <LandmarkIcon className="h-3 w-3" />
                          {candidate.party_name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3">
                        {candidate.bio || 'No bio description provided.'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCastVoteClick(candidate)}
                    className="w-full py-2 bg-gov-blue hover:bg-gov-darkblue text-white rounded-lg text-xs font-bold shadow-md shadow-gov-blue/10 transition-all mt-4 cursor-pointer"
                  >
                    Cast Vote
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && selectedCandidate && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl max-w-md w-full p-6 shadow-xl space-y-6 relative animate-in fade-in zoom-in duration-200">
            
            <div className="text-center space-y-2">
              <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
              <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                Confirm Cast Ballot
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Please verify your selection before submission.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-850 space-y-2">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Your Selection</p>
              <h4 className="font-extrabold text-slate-950 dark:text-white text-base">
                {selectedCandidate.name}
              </h4>
              <p className="text-xs font-semibold text-gov-blue dark:text-gov-gold">
                Representing Party: {selectedCandidate.party_name}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                Constituency: {voterProfile?.constituency_name}
              </p>
            </div>

            <div className="text-[10px] text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-950/20 p-3 rounded border border-red-200/50">
              ⚠️ Warning: Once cast, your ballot cannot be altered, recall or deleted. This transaction is final.
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setConfirmModal(false)}
                className="w-1/2 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold transition-all"
              >
                No, Go Back
              </button>
              <button
                onClick={handleConfirmVote}
                className="w-1/2 py-2 bg-gov-blue hover:bg-gov-darkblue text-white rounded-lg text-xs font-bold shadow-md transition-all"
              >
                Yes, Confirm Vote
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

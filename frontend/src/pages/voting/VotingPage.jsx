import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, HelpCircle } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import { electionService } from '../../services/electionService';
import { candidateService } from '../../services/candidateService';
import { useToast } from '../../context/ToastContext';

export default function VotingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showWarning } = useToast();

  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadVotingHub() {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const elec = await electionService.getElectionById(id);
        const cands = await candidateService.getCandidatesByElection(id);
        setElection(elec);
        setCandidates(cands || []);
      } catch (err) {
        setErrorMsg('Failed to initiate secure voting session. API service offline.');
      } finally {
        setIsLoading(false);
      }
    }
    loadVotingHub();
  }, [id]);

  const handleSelect = (candidate) => {
    setSelectedCandidate(candidate);
  };

  const handleReview = () => {
    if (!selectedCandidate) {
      showWarning('Select a candidate to cast your vote.');
      return;
    }
    navigate(`/elections/${id}/review`, {
      state: { selectedCandidate },
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gov-blue border-t-transparent dark:border-gov-gold"></div>
        <p className="text-sm font-semibold text-slate-500">Establishing secure sandboxed voting interface...</p>
      </div>
    );
  }

  if (errorMsg || !election) {
    return <Alert type="error" title="Secure Hub Denied">{errorMsg || 'Poll session closed.'}</Alert>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Link
          to={`/elections/${id}`}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-805 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Ballot Terminal</h1>
          <p className="text-xs text-slate-500 mt-1">
            Constituency: {election.constituency_name} | Election: {election.name}
          </p>
        </div>
      </div>

      <Alert type="info">
        <div className="flex gap-2 text-xs">
          <HelpCircle className="h-4.5 w-4.5 text-blue-650 shrink-0" />
          <p className="leading-relaxed">
            Please click on a candidate card to select them. Confirm your choice below before proceeding to the secure authentication step.
          </p>
        </div>
      </Alert>

      {/* Candidates ballot options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {candidates.map((cand) => {
          const isSelected = selectedCandidate?.id === cand.id;
          return (
            <div
              key={cand.id}
              onClick={() => handleSelect(cand)}
              className={`cursor-pointer rounded-xl border p-6 transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'border-gov-blue ring-2 ring-gov-blue bg-gov-blue/5 dark:border-gov-gold dark:ring-gov-gold dark:bg-gov-gold/5 shadow-md'
                  : 'border-slate-200 dark:border-slate-850 bg-white dark:bg-gov-cardDark hover:border-slate-350 hover:shadow-xs'
              }`}
            >
              {isSelected && (
                <div className="absolute top-4 right-4 bg-gov-blue dark:bg-gov-gold text-white dark:text-slate-900 rounded-full p-1.5 shrink-0 shadow-xs">
                  <Check className="h-4 w-4 stroke-[3]" />
                </div>
              )}
              
              <div className="space-y-4">
                <div className="h-14 w-14 rounded-lg bg-slate-50 dark:bg-slate-800 border flex items-center justify-center font-bold text-slate-400 overflow-hidden shrink-0">
                  {cand.photo_url ? (
                    <img src={cand.photo_url} alt={cand.name} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-800 dark:text-slate-100">{cand.name}</h4>
                  <p className="text-xs font-semibold text-slate-450 dark:text-slate-400 mt-0.5">
                    Party: {cand.party_name} ({cand.party_symbol})
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Bottom Banner */}
      {selectedCandidate && (
        <div className="sticky bottom-6 left-0 right-0 bg-white dark:bg-gov-cardDark p-6 rounded-xl border border-slate-205 dark:border-slate-850 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p className="text-xs text-slate-450 dark:text-slate-400 uppercase tracking-wider font-semibold">Selected Candidate</p>
            <p className="text-base font-bold text-gov-blue dark:text-gov-slate mt-0.5">
              You are about to cast your vote for <span className="underline">{selectedCandidate.name}</span> ({selectedCandidate.party_symbol})
            </p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              className="w-full md:w-auto"
              onClick={() => setSelectedCandidate(null)}
            >
              Cancel Selection
            </Button>
            <Button
              variant="primary"
              className="w-full md:w-auto"
              onClick={handleReview}
            >
              Review Vote
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

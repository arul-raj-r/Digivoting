import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, ShieldCheck } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import Checkbox from '../../components/forms/Checkbox';
import { electionService } from '../../services/electionService';

export default function VoteReview() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const selectedCandidate = location.state?.selectedCandidate;
  const [election, setElection] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // If no candidate is in state, voter must go back to select
    if (!selectedCandidate) {
      navigate(`/elections/${id}/vote`, { replace: true });
      return;
    }

    async function loadElection() {
      setIsLoading(true);
      try {
        const data = await electionService.getElectionById(id);
        setElection(data);
      } catch (err) {
        setErrorMsg('Failed to load election details.');
      } finally {
        setIsLoading(false);
      }
    }
    loadElection();
  }, [id, selectedCandidate, navigate]);

  const handleSubmit = () => {
    if (!confirm) return;
    // Route to final authentication
    navigate(`/elections/${id}/verify`, {
      state: { selectedCandidate },
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gov-blue dark:border-gov-gold border-t-transparent"></div>
      </div>
    );
  }

  if (errorMsg || !election) {
    return <Alert type="error">{errorMsg || 'Poll session closed.'}</Alert>;
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <Link
          to={`/elections/${id}/vote`}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-805 hover:bg-slate-105 dark:hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Review Selected Ballot</h1>
          <p className="text-xs text-slate-400 mt-1">Verify your choice before casting.</p>
        </div>
      </div>

      <Card title="Review Ballot Selections">
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Election</span>
              <p className="font-semibold text-slate-850 dark:text-slate-200">{election.name}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Constituency</span>
              <p className="font-semibold text-slate-850 dark:text-slate-200">{election.constituency_name}</p>
            </div>
            <div className="sm:col-span-2 space-y-1 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nominee Choice</span>
              <p className="text-base font-extrabold text-gov-blue dark:text-gov-slate mt-1">
                {selectedCandidate?.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Party affiliation: {selectedCandidate?.party_name} ({selectedCandidate?.party_symbol})
              </p>
            </div>
          </div>

          <Alert type="warning" title="Electoral Audit Warning">
            <div className="flex gap-2 text-xs">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="leading-relaxed font-semibold">
                "Once submitted, your vote cannot be changed."
              </p>
            </div>
          </Alert>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <Checkbox
              label="I confirm that I intend to cast my ballot for the selected candidate and understand this transaction is final and immutable."
              id="confirm"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
            />

            <Button
              variant="primary"
              className="w-full"
              disabled={!confirm}
              onClick={handleSubmit}
            >
              Continue Secure Verification
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

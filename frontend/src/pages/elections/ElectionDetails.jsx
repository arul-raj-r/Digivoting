import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Landmark, Calendar, ShieldCheck, HelpCircle, ArrowRight, User } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import { electionService } from '../../services/electionService';
import { voterService } from '../../services/voterService';

export default function ElectionDetails() {
  const { id } = useParams();
  const [election, setElection] = useState(null);
  const [voterStatus, setVoterStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadDetails() {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const elec = await electionService.getElectionById(id);
        setElection(elec);
        
        try {
          const status = await voterService.getVoterStatus();
          setVoterStatus(status);
        } catch (e) {
          console.error('Voter status unavailable', e);
        }
      } catch (err) {
        setErrorMsg('Failed to connect to election registry APIs. The selected election may not exist.');
      } finally {
        setIsLoading(false);
      }
    }
    loadDetails();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gov-blue border-t-transparent dark:border-gov-gold"></div>
      </div>
    );
  }

  if (errorMsg || !election) {
    return <Alert type="error" title="Election Load Failed">{errorMsg || 'Selected poll does not exist.'}</Alert>;
  }

  // Voter eligibility logic matching the backend rules
  const isVoterVerified = voterStatus?.is_identity_verified && voterStatus?.is_eligible;
  const isConstituencyMatch = voterStatus?.constituency_id === election.constituency_id;
  const isEligibleToVote = isVoterVerified && isConstituencyMatch;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{election.name}</h1>
        <p className="text-xs text-slate-500 mt-1">Review polling details, eligibility checklists, and candidate profiles.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left main info */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Poll Specifications">
            <div className="space-y-4 text-sm">
              <p className="text-slate-500 leading-relaxed text-xs sm:text-sm">
                {election.description}
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 text-xs">
                <div>
                  <span className="font-bold text-slate-400 block uppercase">Start date</span>
                  <span className="font-semibold">{election.start_date}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase">End date</span>
                  <span className="font-semibold">{election.end_date}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase">Electoral Area / Constituency</span>
                  <span className="font-semibold">{election.constituency_name}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block uppercase">Election Level</span>
                  <span className="font-semibold uppercase">{election.election_type}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Eligibility Card */}
          <Card title="Constituency & Registry Requirements">
            <div className="space-y-4 text-xs">
              <p className="text-slate-500">
                To vote in this election, citizens must satisfy all of the following:
              </p>
              
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${voterStatus?.is_identity_verified ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  <span>Citizen Identity Verification (Aadhaar / DigiLocker linked)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${voterStatus?.is_eligible ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  <span>Electoral roll registry confirmation</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${isConstituencyMatch ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  <span>Voter card constituency matching this election's constituency code</span>
                </li>
              </ul>
            </div>
          </Card>
        </div>

        {/* Right side Actions */}
        <div className="space-y-6">
          <Card title="Citizen Action Hub">
            <div className="space-y-4">
              {isEligibleToVote ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-350 p-4 rounded-lg text-xs border border-emerald-100 dark:border-emerald-900 leading-relaxed">
                  <p className="font-bold mb-1">Eligible to Vote</p>
                  <p>Your credentials match all registry rules for this election.</p>
                </div>
              ) : (
                <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-350 p-4 rounded-lg text-xs border border-rose-100 dark:border-rose-900 leading-relaxed">
                  <p className="font-bold mb-1">Voting Unavailable</p>
                  {!voterStatus?.is_identity_verified
                    ? 'You must complete legal identity verification first.'
                    : !isConstituencyMatch
                    ? `Your constituency (${voterStatus?.constituency_name || 'Unverified'}) does not match this election (${election.constituency_name}).`
                    : 'Your electoral roll profile check is pending.'}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Link to={`/elections/${election.id}/candidates`}>
                  <Button variant="outline" className="w-full">
                    <User className="h-4.5 w-4.5 mr-2" />
                    View Candidates
                  </Button>
                </Link>

                <Link to={`/elections/${election.id}/vote`} className={!isEligibleToVote ? 'pointer-events-none' : ''}>
                  <Button variant="primary" className="w-full" disabled={!isEligibleToVote}>
                    Proceed to Vote
                    <ArrowRight className="h-4.5 w-4.5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

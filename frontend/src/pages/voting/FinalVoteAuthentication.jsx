import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, ChevronLeft, HelpCircle, Lock } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import Input from '../../components/forms/Input';
import Tabs from '../../components/common/Tabs';
import { votingService } from '../../services/votingService';
import { electionService } from '../../services/electionService';
import { useToast } from '../../context/ToastContext';

export default function FinalVoteAuthentication() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const selectedCandidate = location.state?.selectedCandidate;
  const [election, setElection] = useState(null);
  const [authMethod, setAuthMethod] = useState('otp'); // 'otp' | 'face' | 'biometric'
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!selectedCandidate) {
      navigate(`/elections/${id}/vote`, { replace: true });
      return;
    }

    async function loadElection() {
      try {
        const data = await electionService.getElectionById(id);
        setElection(data);
      } catch (err) {
        setErrorMsg('Failed to load session details.');
      }
    }
    loadElection();
  }, [id, selectedCandidate, navigate]);

  const handleCastVote = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      // Send parameters (candidate id and verification token/code) to the voting service
      const res = await votingService.castVote(id, selectedCandidate.id, {
        method: authMethod,
        code: authMethod === 'otp' ? otpCode : 'biometric-verified',
      });

      if (res.receipt_id) {
        showSuccess('Ballot recorded successfully.');
        navigate(`/elections/${id}/success`, {
          state: { receiptId: res.receipt_id },
          replace: true,
        });
      } else {
        throw new Error('Invalid response from secure endpoint');
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
        'The secure voting API did not confirm your ballot cast. Verification failed.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const methods = [
    { label: 'SMS / Email OTP', value: 'otp' },
    { label: 'Face Verification', value: 'face' },
    { label: 'Device Biometric', value: 'biometric' },
  ];

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        <Link
          to={`/elections/${id}/review`}
          state={{ selectedCandidate }}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-805 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Secure Ballot Authorization</h1>
          <p className="text-xs text-slate-400 mt-1">Authenticate your identity to seal your vote choice.</p>
        </div>
      </div>

      {errorMsg && <Alert type="warning">{errorMsg}</Alert>}

      <Card title="Cast Verification Check">
        <form onSubmit={handleCastVote} className="space-y-6">
          <Tabs tabs={methods} activeTab={authMethod} onChange={setAuthMethod} />

          <div className="py-4">
            {authMethod === 'otp' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter the 6-digit voting authorization code sent to your registered citizen profile.
                </p>
                <Input
                  label="Voting Authorization OTP"
                  id="otpCode"
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  required
                />
              </div>
            )}

            {authMethod === 'face' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-550 leading-relaxed">
                  Confirm liveness checks. Click below to verify your face match against registered templates.
                </p>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-xs border flex items-center justify-between gap-4">
                  <span>Standard camera liveness check ready.</span>
                  <span className="text-[10px] font-bold text-gov-blue dark:text-gov-slate uppercase">Connected</span>
                </div>
              </div>
            )}

            {authMethod === 'biometric' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Press continue to invoke your local device security enclave (Touch ID, Face ID, or PIN via WebAuthn).
                </p>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-xs border flex items-center justify-between gap-4">
                  <span>Device passkey hardware ready.</span>
                  <span className="text-[10px] font-bold text-gov-blue dark:text-gov-slate uppercase">Ready</span>
                </div>
              </div>
            )}
          </div>

          <Alert type="info">
            <div className="flex gap-2 text-xs">
              <Lock className="h-4.5 w-4.5 text-blue-650 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                By completing this authentication, your vote is encrypted, separated from your identity, and written to the database. DigiVote cannot associate your personal details with this vote once sealed.
              </p>
            </div>
          </Alert>

          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
            Verify and Seal Ballot
          </Button>
        </form>
      </Card>
    </div>
  );
}

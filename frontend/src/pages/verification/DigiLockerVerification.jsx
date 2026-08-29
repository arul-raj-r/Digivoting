import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FolderCheck, ShieldCheck } from 'lucide-react';
import VerificationLayout from '../../layouts/VerificationLayout';
import Checkbox from '../../components/forms/Checkbox';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import { identityService } from '../../services/identityService';

export default function DigiLockerVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oauthCode = searchParams.get('code');
  const oauthState = searchParams.get('state');

  const [consent, setConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(oauthCode ? 'callback' : 'prompt');
  const [errorMsg, setErrorMsg] = useState('');

  const steps = [
    { title: 'DigiLocker Consent', description: 'Grant document retrieval consent.' },
    { title: 'Redirect Authentication', description: 'Verify login on DigiLocker portal.' },
  ];

  useEffect(() => {
    // If returning from DigiLocker OAuth with query code
    if (oauthCode) {
      async function handleCallback() {
        setIsLoading(true);
        try {
          await identityService.completeDigiLockerAuth(oauthCode, oauthState);
          // Redirection to dashboard or status page
          navigate('/identity-verification');
        } catch (e) {
          setErrorMsg('Verification failed or was declined by the user.');
          setStatus('prompt');
        } finally {
          setIsLoading(false);
        }
      }
      handleCallback();
    }
  }, [oauthCode, oauthState, navigate]);

  const handleRedirect = async () => {
    if (!consent) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const authUrl = await identityService.getDigiLockerUrl();
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        throw new Error();
      }
    } catch (e) {
      setErrorMsg('DigiLocker verification service is currently unavailable. Integrations will be added in later phases.');
      setIsLoading(false);
    }
  };

  if (status === 'callback') {
    return (
      <VerificationLayout currentStep={2} steps={steps}>
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gov-blue border-t-transparent dark:border-gov-gold"></div>
          <p className="text-sm font-semibold text-slate-500">Retrieving certified voter parameters from DigiLocker...</p>
        </div>
      </VerificationLayout>
    );
  }

  return (
    <VerificationLayout currentStep={1} steps={steps}>
      <div className="space-y-6">
        <div className="flex items-center gap-2.5">
          <FolderCheck className="h-6 w-6 text-gov-blue dark:text-gov-slate" />
          <h2 className="text-xl font-bold">DigiLocker Verification</h2>
        </div>

        <div className="space-y-4 text-xs text-slate-500 leading-relaxed">
          <p>
            Voters can authenticate using DigiLocker to securely transfer their digital voter ID card (e-EPIC) records.
          </p>
          <p className="font-semibold text-slate-700 dark:text-slate-350 flex items-center gap-1.5">
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
            Security Commitments:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>We do NOT ask for or store your DigiLocker password or security PIN.</li>
            <li>Authentication is executed directly on official DigiLocker servers.</li>
            <li>Voters explicitly authorize retrieval of only the Voter ID record.</li>
          </ul>
        </div>

        {errorMsg && <Alert type="warning">{errorMsg}</Alert>}

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <Checkbox
            label="I authorize DigiVote to request my digital Voter ID card details from my DigiLocker account."
            id="consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button
            variant="primary"
            className="w-full"
            disabled={!consent || isLoading}
            onClick={handleRedirect}
            isLoading={isLoading}
          >
            Continue to DigiLocker
          </Button>
        </div>
      </div>
    </VerificationLayout>
  );
}

import { useState } from 'react';
import { ShieldCheck, Landmark } from 'lucide-react';
import VerificationLayout from '../../layouts/VerificationLayout';
import Checkbox from '../../components/forms/Checkbox';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import { identityService } from '../../services/identityService';

export default function AadhaarVerification() {
  const [consent, setConsent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('Identity verification service is currently unavailable.');
  const [isLoading, setIsLoading] = useState(false);

  const steps = [
    { title: 'Identity Consent', description: 'Agree to digital verification parameters.' },
    { title: 'Aadhaar Check', description: 'Verify via secure government gateway.' },
  ];

  const handleVerify = async () => {
    if (!consent) return;
    setIsLoading(true);
    try {
      // Trigger API check
      await identityService.verifyAadhaar();
    } catch (e) {
      setErrorMsg('Identity verification service is currently unavailable. Authorized provider integrations are pending.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <VerificationLayout currentStep={1} steps={steps}>
      <div className="space-y-6">
        <div className="flex items-center gap-2.5">
          <Landmark className="h-6 w-6 text-gov-blue dark:text-gov-slate" />
          <h2 className="text-xl font-bold">Aadhaar Identity Link</h2>
        </div>

        <div className="space-y-4 text-xs text-slate-500 leading-relaxed">
          <p>
            Voters can link their official Aadhaar parameters to verify their legal identity. This matches details against the national voter database.
          </p>
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            Privacy & Non-Retention Policy:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>We do NOT store your 12-digit Aadhaar number in local storage.</li>
            <li>No biometric thumbprints or iris scans are processed on this browser.</li>
            <li>Once authenticated by the external portal, the session terminates safely.</li>
          </ul>
        </div>

        {errorMsg && (
          <Alert type="warning" title="Provider Unavailable">
            {errorMsg}
          </Alert>
        )}

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <Checkbox
            label="I provide consent to DigiVote to verify my registration details against electoral records using authorized secure protocols."
            id="consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button
            variant="primary"
            className="w-full"
            disabled={!consent || isLoading}
            onClick={handleVerify}
            isLoading={isLoading}
          >
            Continue with Authorized verification provider
          </Button>
        </div>
      </div>
    </VerificationLayout>
  );
}

import { useState } from 'react';
import { Landmark, UserCheck } from 'lucide-react';
import VerificationLayout from '../../layouts/VerificationLayout';
import Checkbox from '../../components/forms/Checkbox';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import Input from '../../components/forms/Input';
import { identityService } from '../../services/identityService';

export default function VoterIdVerification() {
  const [consent, setConsent] = useState(false);
  const [voterIdNum, setVoterIdNum] = useState('');
  const [errorMsg, setErrorMsg] = useState('Identity verification service is currently unavailable.');
  const [isLoading, setIsLoading] = useState(false);

  const steps = [
    { title: 'Voter Roll Consent', description: 'Agree to digital verification parameters.' },
    { title: 'Voter ID Roll Search', description: 'Verify EPIC card number.' },
  ];

  const handleVerify = async () => {
    if (!consent || !voterIdNum) return;
    setIsLoading(true);
    try {
      await identityService.verifyVoterId(voterIdNum);
    } catch (e) {
      setErrorMsg('Voter ID roll search service is currently unavailable. Integrations will be added in later phases.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <VerificationLayout currentStep={1} steps={steps}>
      <div className="space-y-6">
        <div className="flex items-center gap-2.5">
          <UserCheck className="h-6 w-6 text-gov-blue dark:text-gov-slate" />
          <h2 className="text-xl font-bold">Voter ID Card verification</h2>
        </div>

        <div className="space-y-4 text-xs text-slate-500 leading-relaxed">
          <p>
            Voters can link their registered voter card (EPIC card) to their account profile. This checks details against ECI rolls.
          </p>
          <p className="font-semibold text-slate-705 dark:text-slate-350">
            Terms of Use:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>We check details against official electoral registries.</li>
            <li>Once certified, your constituency is updated in the secure voter dashboard.</li>
          </ul>
        </div>

        {errorMsg && <Alert type="warning">{errorMsg}</Alert>}

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <Input
            label="EPIC Card Number (Voter ID Number)"
            id="voterIdNum"
            value={voterIdNum}
            onChange={(e) => setVoterIdNum(e.target.value.toUpperCase())}
            placeholder="e.g. ABC1234567"
            required
          />

          <Checkbox
            label="I provide consent to verify this Voter ID Number against official electoral rolls."
            id="consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />

          <Button
            variant="primary"
            className="w-full"
            disabled={!consent || !voterIdNum || isLoading}
            onClick={handleVerify}
            isLoading={isLoading}
          >
            Submit Voter ID verification
          </Button>
        </div>
      </div>
    </VerificationLayout>
  );
}

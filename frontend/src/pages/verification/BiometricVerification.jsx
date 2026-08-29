import { useState } from 'react';
import { Fingerprint, ShieldCheck, AlertCircle } from 'lucide-react';
import VerificationLayout from '../../layouts/VerificationLayout';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import { verificationService } from '../../services/verificationService';

export default function BiometricVerification() {
  const [enrollmentStatus, setEnrollmentStatus] = useState('not-enrolled'); // 'not-enrolled' | 'enrolled' | 'failed'
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const steps = [
    { title: 'WebAuthn Consent', description: 'Understand hardware-bound security.' },
    { title: 'Key Registration', description: 'Register browser passkey.' },
  ];

  const handleRegisterDevice = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      // Simulate/trigger WebAuthn registration call to backend
      await verificationService.registerWebAuthn();
      setEnrollmentStatus('enrolled');
    } catch (e) {
      setEnrollmentStatus('failed');
      setErrorMsg('WebAuthn / passkey device enrollment is currently unavailable on the backend server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <VerificationLayout currentStep={enrollmentStatus === 'enrolled' ? 2 : 1} steps={steps}>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Fingerprint className="h-6 w-6 text-gov-blue dark:text-gov-slate" />
          <h2 className="text-xl font-bold">Device Biometric Security</h2>
        </div>

        <div className="space-y-4 text-xs text-slate-500 leading-relaxed">
          <p>
            Voters can link their computer or mobile device hardware credentials using the WebAuthn / Passkey standard.
          </p>
          <p className="font-semibold text-slate-700 dark:text-slate-350">
            Privacy Safeguards:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>The browser does NOT read or transmit raw fingerprint or face scan data.</li>
            <li>Your biometrics remain locked in your device secure enclave.</li>
            <li>Authentication is executed locally on your device to unlock a cryptographic session key.</li>
          </ul>
        </div>

        {errorMsg && <Alert type="warning">{errorMsg}</Alert>}

        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-xs">
            <span className="font-semibold">Device Enrollment Status:</span>
            {enrollmentStatus === 'enrolled' ? (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <ShieldCheck className="h-4.5 w-4.5" /> Enrolled
              </span>
            ) : enrollmentStatus === 'failed' ? (
              <span className="text-rose-600 font-bold flex items-center gap-1">
                <AlertCircle className="h-4.5 w-4.5" /> Enrollment Required
              </span>
            ) : (
              <span className="text-slate-450 font-bold">Not Enrolled</span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="primary"
              className="flex-grow"
              onClick={handleRegisterDevice}
              isLoading={isLoading}
              disabled={enrollmentStatus === 'enrolled'}
            >
              Register Device Passkey
            </Button>
            
            <Button
              variant="outline"
              disabled={enrollmentStatus !== 'enrolled'}
              onClick={async () => {
                try {
                  await verificationService.authenticateWebAuthn();
                } catch (e) {
                  setErrorMsg('Device key authentication failed.');
                }
              }}
            >
              Test Authenticate
            </Button>
          </div>
        </div>
      </div>
    </VerificationLayout>
  );
}

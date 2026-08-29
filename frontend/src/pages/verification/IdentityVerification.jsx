import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  ShieldAlert,
  Camera,
  Fingerprint,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info
} from 'lucide-react';
import Card from '../../components/common/Card';
import StatusBadge from '../../components/common/StatusBadge';
import Alert from '../../components/common/Alert';
import { voterService } from '../../services/voterService';

export default function IdentityVerification() {
  const [voterStatus, setVoterStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchStatus() {
      try {
        const data = await voterService.getVoterStatus();
        setVoterStatus(data);
      } catch (err) {
        setError('Verification status information is currently unavailable.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchStatus();
  }, []);

  const getStatusText = (isCompleted) => (isCompleted ? 'Verified' : 'Not Started');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Citizen Verification Center</h1>
        <p className="text-xs text-slate-500 mt-1">
          Complete mandatory verification checks to authorize your digital voting capabilities.
        </p>
      </div>

      {error && <Alert type="warning">{error}</Alert>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Legal Identity */}
        <Card
          title="Legal Identity Verification"
          subtitle="Link official identifiers to verify your voting records."
          actions={
            <StatusBadge 
              status={
                isLoading 
                  ? 'PENDING' 
                  : voterStatus?.is_identity_verified 
                  ? 'VERIFIED' 
                  : 'NOT STARTED'
              } 
            />
          }
        >
          <div className="space-y-4">
            <div className="flex gap-3 text-xs text-slate-500">
              <User className="h-5 w-5 text-slate-400 shrink-0" />
              <p className="leading-relaxed">
                Connect your profile using Aadhaar e-KYC or certified DigiLocker sign-in. This verifies your full name, birth year, and residential parameters.
              </p>
            </div>
            
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-between items-center">
              <span className="text-[11px] text-slate-400">Method: Aadhaar / DigiLocker</span>
              {!voterStatus?.is_identity_verified ? (
                <Link to="/identity-verification/aadhaar">
                  <button className="inline-flex items-center gap-1 text-xs font-semibold text-gov-blue dark:text-gov-slate hover:underline">
                    Begin Verification
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </Link>
              ) : (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-450 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Connected
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Step 2: Voter Eligibility Registry */}
        <Card
          title="Voter Registry Check"
          subtitle="Confirm your registered electoral constituency parameters."
          actions={
            <StatusBadge 
              status={
                isLoading 
                  ? 'PENDING' 
                  : voterStatus?.is_eligible 
                  ? 'VERIFIED' 
                  : 'NOT STARTED'
              } 
            />
          }
        >
          <div className="space-y-4">
            <div className="flex gap-3 text-xs text-slate-500">
              <ShieldAlert className="h-5 w-5 text-slate-400 shrink-0" />
              <p className="leading-relaxed">
                The electoral registry checks if your identity matches a registered constituency polling roll. Required to retrieve eligible ballots.
              </p>
            </div>
            
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-between items-center">
              <span className="text-[11px] text-slate-400">Registry status check</span>
              <Link to="/voter-verification">
                <button className="inline-flex items-center gap-1 text-xs font-semibold text-gov-blue dark:text-gov-slate hover:underline">
                  View Registry Roll
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Step 3: Face Verification */}
        <Card
          title="Face Verification"
          subtitle="Capture secure face verification parameters for multi-factor login checks."
          actions={
            <StatusBadge 
              status={
                isLoading 
                  ? 'PENDING' 
                  : voterStatus?.is_face_verified 
                  ? 'VERIFIED' 
                  : 'NOT STARTED'
              } 
            />
          }
        >
          <div className="space-y-4">
            <div className="flex gap-3 text-xs text-slate-500">
              <Camera className="h-5 w-5 text-slate-400 shrink-0" />
              <p className="leading-relaxed">
                Configure your secure camera profile. Used during election casting to verify you match your voter card image, preventing duplicates.
              </p>
            </div>
            
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-between items-center">
              <span className="text-[11px] text-slate-400">Liveness check required</span>
              {!voterStatus?.is_face_verified ? (
                <Link to="/face-verification">
                  <button className="inline-flex items-center gap-1 text-xs font-semibold text-gov-blue dark:text-gov-slate hover:underline">
                    Capture Profile
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </Link>
              ) : (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-450 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Enrolled
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Step 4: Device Biometric / WebAuthn */}
        <Card
          title="Device Biometric Security"
          subtitle="Register your computer or phone WebAuthn passkey."
          actions={
            <StatusBadge 
              status={
                isLoading 
                  ? 'PENDING' 
                  : voterStatus?.is_biometric_enrolled 
                  ? 'VERIFIED' 
                  : 'NOT STARTED'
              } 
            />
          }
        >
          <div className="space-y-4">
            <div className="flex gap-3 text-xs text-slate-500">
              <Fingerprint className="h-5 w-5 text-slate-400 shrink-0" />
              <p className="leading-relaxed">
                Secure your voting interface by binding your browser session to your device PIN, Touch ID, or Face unlock via the secure WebAuthn standard.
              </p>
            </div>
            
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-between items-center">
              <span className="text-[11px] text-slate-400">Passkey setup</span>
              {!voterStatus?.is_biometric_enrolled ? (
                <Link to="/biometric">
                  <button className="inline-flex items-center gap-1 text-xs font-semibold text-gov-blue dark:text-gov-slate hover:underline">
                    Enroll Device
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </Link>
              ) : (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-450 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Enrolled
                </span>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Alert type="info">
        <div className="flex items-start gap-2 text-xs">
          <Info className="h-4.5 w-4.5 text-blue-650 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            All biometrics, face models, and government credentials are processed on authorized sandboxed APIs. DigiVote does not capture or store raw fingerprints or credentials on the server.
          </p>
        </div>
      </Alert>
    </div>
  );
}

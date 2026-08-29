import { ShieldCheck, EyeOff, ShieldAlert, Key } from 'lucide-react';
import Card from '../../components/common/Card';

export default function Security() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="max-w-3xl space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Security Architecture</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
          The safety and integrity of public votes are maintained through cryptographic protocols, isolated backend systems, and device-level verification.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Device Biometrics & WebAuthn" icon={<Key className="h-6 w-6" />}>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
            Ensures that the voting device is controlled by the verified owner. WebAuthn handles device-level security without exposing biometric data to the web.
          </p>
        </Card>
        <Card title="Face Verification" icon={<ShieldCheck className="h-6 w-6" />}>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
            Verifies the user matches the voter profile before a vote can be finalized, preventing duplicate casting or account takeovers.
          </p>
        </Card>
        <Card title="Data Privacy & Anonymity" icon={<EyeOff className="h-6 w-6" />}>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
            Ballot logs do not connect to individual voter names or registration details in the database, preserving absolute confidentiality.
          </p>
        </Card>
        <Card title="Audit Event Trails" icon={<ShieldAlert className="h-6 w-6" />}>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
            Tracks all operations, configuration updates, and device profiles to immediately flag duplicate voting attempts or database mismatches.
          </p>
        </Card>
      </div>
    </div>
  );
}

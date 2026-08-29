import { Landmark, Shield, Users } from 'lucide-react';
import Card from '../../components/common/Card';

export default function About() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="max-w-3xl space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">About DigiVote</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
          DigiVote is a next-generation secure online voting system designed to make electoral processes transparent, accessible, and highly resilient against operational risks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Constituency-focused" icon={<Landmark className="h-6 w-6" />}>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
            Organizes polls at national, state, and local constituency levels, ensuring exact voter-to-ballot mapping.
          </p>
        </Card>
        <Card title="High-Security Guarantee" icon={<Shield className="h-6 w-6" />}>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
            Employs device-level biometrics, Face Verification, and Multi-Factor Authentication to secure logins.
          </p>
        </Card>
        <Card title="Citizen First" icon={<Users className="h-6 w-6" />}>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
            Focuses on responsive design, high contrast themes, and complete keyboard accessibility.
          </p>
        </Card>
      </div>
    </div>
  );
}

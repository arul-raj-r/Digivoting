import { UserPlus, UserCheck, ShieldCheck, CheckCircle } from 'lucide-react';
import Card from '../../components/common/Card';

export default function HowItWorks() {
  const steps = [
    { icon: <UserPlus className="h-6 w-6 text-gov-blue dark:text-gov-slate" />, title: 'Voter Registration', text: 'Register an account using your email and mobile number. Confirm your email verification link.' },
    { icon: <UserCheck className="h-6 w-6 text-gov-blue dark:text-gov-slate" />, title: 'Voter Eligibility Verification', text: 'Authenticate with legal credentials (Aadhaar, Voter ID, or DigiLocker) to verify your constituency.' },
    { icon: <ShieldCheck className="h-6 w-6 text-gov-blue dark:text-gov-slate" />, title: 'Secure Enrollment', text: 'Enroll device biometrics and capture secure Face Verification hashes to secure future sign-ins.' },
    { icon: <CheckCircle className="h-6 w-6 text-gov-blue dark:text-gov-slate" />, title: 'Cast & Verify Ballot', text: 'Cast your ballot in active elections, verify candidate profiles, and collect your secure receipt.' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="max-w-3xl space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">How DigiVote Works</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
          DigiVote breaks down the voting cycle into simple steps, prioritizing security at every phase.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {steps.map((step, idx) => (
          <div key={idx} className="flex gap-4 p-6 bg-white dark:bg-gov-cardDark border border-slate-205 dark:border-slate-850 rounded-xl shadow-xs">
            <div className="shrink-0">{step.icon}</div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">{step.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{step.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

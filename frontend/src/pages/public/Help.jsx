import { LifeBuoy, FileText, Settings, ShieldCheck } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

export default function Help() {
  const topics = [
    { icon: <ShieldCheck className="h-6 w-6 text-gov-slate" />, title: 'Voter Identity Verification Help', desc: 'Step-by-step guidance on connecting Aadhaar, Voter ID, and DigiLocker credentials.' },
    { icon: <Settings className="h-6 w-6 text-gov-slate" />, title: 'Biometrics & Face Registration', desc: 'Troubleshooting camera capture issues, lighting rules, and passkey registration.' },
    { icon: <FileText className="h-6 w-6 text-gov-slate" />, title: 'Ballots & Cryptographic Receipts', desc: 'How to download and verify your cast vote receipt without exposing candidate choices.' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <LifeBuoy className="h-12 w-12 mx-auto text-gov-blue dark:text-gov-slate" />
        <h1 className="text-3xl font-extrabold tracking-tight">Citizen Help Center</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Find user guides, troubleshooting details, and documentation for digital voting procedures.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {topics.map((topic, idx) => (
          <Card key={idx} title={topic.title}>
            <div className="mb-4">{topic.icon}</div>
            <p className="text-xs text-slate-500 dark:text-slate-405 leading-relaxed mb-4">
              {topic.desc}
            </p>
            <Button variant="outline" size="sm" className="w-full">
              Read Guides
            </Button>
          </Card>
        ))}
      </div>

      <div className="bg-slate-100 dark:bg-slate-900/50 p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">Still need help?</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Submit a support ticket and our operations team will review your case.</p>
        </div>
        <Button variant="primary">Create Support Ticket</Button>
      </div>
    </div>
  );
}

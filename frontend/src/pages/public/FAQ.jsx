import { HelpCircle } from 'lucide-react';

export default function FAQ() {
  const faqs = [
    { q: 'Is my vote completely private?', a: 'Yes. DigiVote utilizes cryptographic separation. Your identity is verified to check eligibility, but the link between your personal details and candidate choice is completely severed when writing to the database.' },
    { q: 'Can I change my vote after submitting?', a: 'No. To maintain audit integrity, once a vote is cast and a cryptographic receipt is generated, it cannot be changed or recalled.' },
    { q: 'Do I need biometric enrollment to vote?', a: 'Yes. Face Verification and Device Biometric / WebAuthn are required to authenticate your identity during the final voting step.' },
    { q: 'What is the vote receipt used for?', a: 'The receipt contains a transaction reference. You can input this reference in the verification page to confirm that your vote is cataloged in the audit logs.' }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">Frequently Asked Questions</h1>
        <p className="text-sm text-slate-500">Find answers to operational, privacy, and technical questions.</p>
      </div>

      <div className="space-y-6 pt-6">
        {faqs.map((faq, idx) => (
          <div key={idx} className="border-b border-slate-200 dark:border-slate-800 pb-6">
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
              <HelpCircle className="h-4.5 w-4.5 text-gov-slate shrink-0" />
              {faq.q}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 pl-6 leading-relaxed">
              {faq.a}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { 
  HelpCircle, 
  Mail, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  ChevronDown, 
  Search,
  MessageSquare
} from 'lucide-react';

export default function HelpSupport() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      q: 'How does DigiVote guarantee that my ballot selection remains secret?',
      a: 'DigiVote employs a zero-knowledge architectural decoupling protocol. When you submit your vote, the application encrypts your choice and writes it to an isolated ballot table that holds zero foreign keys or relational references to your member account or identity. Once recorded, no election organizer, administrator, or auditor can link your choice back to you.'
    },
    {
      q: 'Why is there no downloadable vote receipt showing my candidate choice?',
      a: 'In electronic balloting standards, providing a verifiable vote receipt with your chosen candidate creates a coercion vulnerability (an outside party could force you to show proof of who you voted for). To protect every member against coercion, the system only confirms that your ballot was successfully recorded.'
    },
    {
      q: 'What should I do if an election shows "Special verification requirements configured"?',
      a: 'Some organizational contests may be configured by their organizer with experimental verification flags (such as biometric or webcam modules). If hardware requirements are active on an election and your browser cannot meet them, the voting booth will notify you that voting is currently restricted.'
    },
    {
      q: 'Can I change my vote after submitting?',
      a: 'By default, votes are final upon submission to prevent duplicate balloting. However, if an election organizer has explicitly enabled the "Allow Vote Change" policy in the election rules, you may update your vote before polls close. Check the rules of your specific election for details.'
    },
    {
      q: 'When and where can I view the election results?',
      a: 'Once an election concludes and the organizer certifies and publishes the final tally, you can view the complete certified results directly under the Election Results portal. If an election had fewer than 10 ballots cast, a small-electorate disclosure notice will accompany the tally.'
    },
    {
      q: 'How do I contact DigiVote organization support?',
      a: 'Members can reach out to our organization support desk via email at support@digivote.app or contact their internal committee election administrator.'
    }
  ];

  const filteredFaqs = faqs.filter(
    f => f.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
         f.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-sky-600 text-white flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                Member Assistance & Help Center
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
              Official voting guidelines, secrecy safeguards, and member support resources.
            </p>
          </div>

          {/* Support Desk Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 font-bold">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Support Desk</span>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white">support@digivote.app</span>
              <span className="text-[10px] text-slate-400 block">Organizational Inquiries</span>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="mt-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions about ballot secrecy, voting rules, results..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-sky-500/20 focus:outline-none dark:text-white placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* FAQs Accordion */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-3 transition-colors">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
          Frequently Asked Questions
        </h2>

        {filteredFaqs.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            No matching questions found for "{searchQuery}".
          </p>
        ) : (
          filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div 
                key={idx}
                className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? -1 : idx)}
                  className="w-full flex items-center justify-between p-4 text-left font-semibold text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <span className="pr-4">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-sky-600 dark:text-sky-400' : ''}`} />
                </button>
                {isOpen && (
                  <div className="p-4 pt-0 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/20">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Integrity Safeguards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200">Zero Relational Linkage</h3>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
            Ballots contain no member identifiers, preserving complete secrecy for every vote.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
          <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200">Immutable Audit Trail</h3>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
            Every administrative transition is recorded chronologically in an immutable audit ledger.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200">Encrypted Ballots</h3>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
            Ballot selections are encrypted before dispatch, neutralizing intermediary eavesdropping.
          </p>
        </div>
      </div>

    </div>
  );
}

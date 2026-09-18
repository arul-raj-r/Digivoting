import React from 'react';
import { 
  Shield, 
  Sparkles, 
  Vote, 
  UserCheck, 
  FileQuestion, 
  HelpCircle,
  Award,
  CheckCircle2
} from 'lucide-react';

const SUGGESTIONS = [
  {
    icon: Vote,
    title: 'How can I vote?',
    description: 'Step-by-step instructions on casting your ballot securely.',
  },
  {
    icon: UserCheck,
    title: 'How does voter verification work?',
    description: 'Understand OTP codes and biometric verification requirements.',
  },
  {
    icon: Shield,
    title: 'What is DigiVote?',
    description: 'Platform security, cryptographic auditing, and privacy standards.',
  },
  {
    icon: HelpCircle,
    title: 'How do I know whether I am eligible to vote?',
    description: 'Check voter roll status and election eligibility rules.',
  },
  {
    icon: Award,
    title: 'What happens after I submit my vote?',
    description: 'Cryptographic receipt generation and ballot audit logs.',
  },
  {
    icon: FileQuestion,
    title: 'How do elections work in DigiVote?',
    description: 'Overview of scheduled, live, and completed election stages.',
  },
];

export default function AIWelcome({ onSelectPrompt, activeElectionTitle = null }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 flex flex-col items-center justify-center max-w-4xl mx-auto w-full text-center select-none">
      
      {/* Brand Hero Icon */}
      <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/15 border border-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-sm">
        <Sparkles className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
        How can I help you?
      </h2>

      <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
        I can help with DigiVote elections, voter verification, voting procedures, and general platform security information.
      </p>

      {/* Active Election Notice */}
      {activeElectionTitle && (
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Active Context: <span className="underline decoration-indigo-400">{activeElectionTitle}</span></span>
        </div>
      )}

      {/* Suggested Questions Grid */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
        {SUGGESTIONS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectPrompt(item.title)}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-md transition-all group flex items-start gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0 mt-0.5">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-[13px] font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors block leading-tight">
                  {item.title}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {item.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

import React from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * Professional civic loading indicator for pending AI responses.
 * Follows accessibility guidelines with role="status" and aria-live.
 */
export default function AILoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-start gap-3 py-2 animate-in fade-in duration-200"
    >
      {/* Assistant Avatar */}
      <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-600/20 flex items-center justify-center shrink-0 shadow-xs">
        <HelpCircle className="w-4 h-4 animate-pulse" />
      </div>

      <div className="flex flex-col gap-1.5 max-w-[85%] sm:max-w-[75%]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-tight">
            DigiVote Help
          </span>
        </div>

        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Consulting Guide
          </span>
          <div className="flex items-center gap-1" aria-hidden="true">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="sr-only">DigiVote Help is preparing your guidance...</span>
        </div>
      </div>
    </div>
  );
}

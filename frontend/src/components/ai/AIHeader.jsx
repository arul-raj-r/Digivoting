import React from 'react';
import { Sparkles, RotateCcw, X, CheckCircle2, ShieldCheck, Layers } from 'lucide-react';

/**
 * Top header for AI Assistant page.
 * Displays title, subtitle, active election context pill, and New Conversation reset button.
 */
export default function AIHeader({
  activeElection = null,
  onClearElection = null,
  onNewConversation = null,
  hasMessages = false,
}) {
  return (
    <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#080d19] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
      
      {/* Title & Subtitle */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
              DigiVote Assistant
            </h1>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold hidden sm:inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              OFFICIAL AI
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ask questions about elections, verification and voting.
          </p>
        </div>
      </div>

      {/* Right Controls: Context Pill + New Conversation Button */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
        
        {/* Election Context Pill (Section 15) */}
        {activeElection && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold max-w-[220px] sm:max-w-[260px] truncate">
            <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate">Context: {activeElection.title || 'Selected Election'}</span>
            {onClearElection && (
              <button
                type="button"
                onClick={onClearElection}
                title="Clear election context"
                aria-label="Clear election context"
                className="p-0.5 hover:bg-indigo-200/50 dark:hover:bg-indigo-900 rounded text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-200 transition-colors ml-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* New Conversation Reset Action (Section 16) */}
        {hasMessages && (
          <button
            type="button"
            onClick={onNewConversation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shrink-0"
            title="Start a new conversation"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>New conversation</span>
          </button>
        )}
      </div>

    </div>
  );
}

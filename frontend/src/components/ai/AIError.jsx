import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

/**
 * Renders sanitized error notifications within the chat flow,
 * providing a retry button for temporary network or API failures.
 */
export default function AIError({ error, onRetry }) {
  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error.message || 'An error occurred. Please try again.';

  return (
    <div
      role="alert"
      className="my-3 p-3.5 rounded-2xl bg-rose-50/90 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-200 shadow-xs"
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-rose-900 dark:text-rose-200">
            Assistant Notification
          </p>
          <p className="text-rose-700 dark:text-rose-300 mt-0.5 leading-relaxed">
            {errorMessage}
          </p>
        </div>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-rose-900/40 text-rose-700 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-semibold border border-rose-200/80 dark:border-rose-800 transition-colors shrink-0 self-end sm:self-center focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}

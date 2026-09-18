import React, { useState, useRef, useEffect } from 'react';
import { Send, CornerDownLeft, AlertCircle } from 'lucide-react';

const MAX_CHAR_LIMIT = 2000;

/**
 * Chat input composer component with keyboard shortcuts, character limit validation,
 * responsive textarea auto-resizing, and safety disclaimer.
 */
export default function AIComposer({
  onSendMessage,
  isLoading = false,
  placeholder = 'Ask DigiVote Assistant a question...',
}) {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea height up to a maximum
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 140)}px`;
    }
  }, [input]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    onSendMessage(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const charCount = input.length;
  const isOverLimit = charCount > MAX_CHAR_LIMIT;
  const isSendDisabled = isLoading || !input.trim() || isOverLimit;

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#080d19]/95 backdrop-blur-md px-4 sm:px-6 py-3 shrink-0">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-2">
        
        {/* Input Wrapper Card */}
        <div className="relative rounded-2xl bg-slate-50 dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all p-2 sm:p-2.5">
          <label htmlFor="ai-chat-input" className="sr-only">
            Ask DigiVote Assistant a question
          </label>
          <textarea
            id="ai-chat-input"
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={placeholder}
            className="w-full bg-transparent resize-none text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none px-2 py-1 min-h-[38px] max-h-[140px] leading-relaxed"
          />

          {/* Bottom Toolbar inside composer */}
          <div className="flex items-center justify-between pt-1 px-1 text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-200/50 dark:border-slate-800/50 mt-1">
            
            {/* Keyboard shortcut hint / Character counter */}
            <div className="flex items-center gap-2 font-mono">
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px]">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-400">
                  Enter
                </kbd>
                <span>to send</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-400">
                  Shift+Enter
                </kbd>
                <span>new line</span>
              </span>

              {/* Show character count when approaching limit */}
              {charCount > 1500 && (
                <span className={`text-[10px] ${isOverLimit ? 'text-rose-500 font-bold' : ''}`}>
                  {charCount}/{MAX_CHAR_LIMIT}
                </span>
              )}
            </div>

            {/* Send Action Button */}
            <button
              type="submit"
              disabled={isSendDisabled}
              aria-label="Send question"
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-all shadow-xs ${
                isSendDisabled
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:scale-95'
              }`}
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Safety Disclaimer UX (Section 23) */}
        <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 leading-normal px-2">
          DigiVote Assistant provides informational guidance. It does not cast votes, change election settings, or recommend candidates.
        </p>

      </form>
    </div>
  );
}

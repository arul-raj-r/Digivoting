import React, { useState } from 'react';
import { HelpCircle, User, ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import AISourceList from './AISourceList';
import aiService from '../../services/aiService';

/**
 * Parses inline formatting (bold **text**, inline `code`) safely into React nodes.
 * Does NOT use dangerouslySetInnerHTML.
 */
function renderInlineFormatting(text) {
  if (!text) return null;

  // Regex pattern matching `code` and **bold**
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={index} className="font-semibold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono text-[11px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

/**
 * Safely renders markdown blocks (paragraphs, bullet lists, numbered lists) into React elements.
 */
function FormattedMessageContent({ content }) {
  if (!content) return null;

  // Split into block chunks by double newline
  const blocks = content.split(/\n\s*\n/);

  return (
    <div className="space-y-2.5 leading-relaxed text-xs sm:text-[13px]">
      {blocks.map((block, bIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        const lines = trimmed.split('\n');

        // Check if all or most lines are bullet points
        const isBulletList = lines.every((line) => /^[-*•]\s+/.test(line.trim()));
        if (isBulletList) {
          return (
            <ul key={bIdx} className="list-disc list-outside pl-4 space-y-1.5 text-slate-700 dark:text-slate-200">
              {lines.map((line, lIdx) => {
                const itemText = line.trim().replace(/^[-*•]\s+/, '');
                return <li key={lIdx}>{renderInlineFormatting(itemText)}</li>;
              })}
            </ul>
          );
        }

        // Check if all lines are numbered list items
        const isNumberedList = lines.every((line) => /^\d+\.\s+/.test(line.trim()));
        if (isNumberedList) {
          return (
            <ol key={bIdx} className="list-decimal list-outside pl-4 space-y-1.5 text-slate-700 dark:text-slate-200">
              {lines.map((line, lIdx) => {
                const itemText = line.trim().replace(/^\d+\.\s+/, '');
                return <li key={lIdx}>{renderInlineFormatting(itemText)}</li>;
              })}
            </ol>
          );
        }

        // Regular paragraph
        return (
          <p key={bIdx} className="text-slate-700 dark:text-slate-200">
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {renderInlineFormatting(line)}
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Single chat message bubble.
 * Renders user query right-aligned, assistant answer left-aligned with sources and feedback.
 */
export default function AIMessage({ message }) {
  const isUser = message.role === 'user';
  const timestamp = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  // Stage 5 Feedback state
  const [feedbackRating, setFeedbackRating] = useState(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const handleFeedback = async (rating) => {
    if (feedbackRating || isSubmittingFeedback || !message.requestId) return;
    setIsSubmittingFeedback(true);
    try {
      await aiService.submitFeedback(message.requestId, rating);
      setFeedbackRating(rating);
      setFeedbackSuccess(true);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end py-1.5 animate-in fade-in duration-200">
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%]">
          <div className="flex items-center gap-1.5 mb-1 px-1">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
              You
            </span>
            {timestamp && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                · {timestamp}
              </span>
            )}
          </div>

          <div className="px-4 py-2.5 rounded-2xl rounded-tr-xs bg-indigo-600 text-white shadow-xs font-normal text-xs sm:text-[13px] leading-relaxed break-words">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
      </div>
    );
  }

  // Assistant Message
  return (
    <div className="flex items-start gap-3 py-2 animate-in fade-in duration-200">
      {/* Assistant Badge / Avatar */}
      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20 mt-0.5">
        <HelpCircle className="w-4 h-4 text-white" />
      </div>

      <div className="flex flex-col flex-1 max-w-[90%] sm:max-w-[85%]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
            DigiVote Help
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-bold uppercase">
            HELP
          </span>
          {timestamp && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
              · {timestamp}
            </span>
          )}
        </div>

        {/* Message Container Card */}
        <div className="p-4 sm:p-5 rounded-2xl rounded-tl-xs bg-white dark:bg-[#0d1527] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <FormattedMessageContent content={message.content} />

          {/* Source references if returned */}
          {Array.isArray(message.sources) && message.sources.length > 0 && (
            <AISourceList sources={message.sources} />
          )}

          {/* User Feedback Widget (Stage 5) */}
          {message.requestId && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              {feedbackSuccess ? (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-[11px] animate-in fade-in duration-200">
                  <Check className="w-3.5 h-3.5" />
                  Thanks for your feedback.
                </span>
              ) : (
                <>
                  <span className="text-[11px]">Was this helpful?</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isSubmittingFeedback || Boolean(feedbackRating)}
                      onClick={() => handleFeedback('helpful')}
                      className={`p-1.5 rounded-lg border transition-all ${
                        feedbackRating === 'helpful'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-600'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400'
                      } disabled:opacity-50 cursor-pointer`}
                      title="Helpful"
                      aria-label="Helpful"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingFeedback || Boolean(feedbackRating)}
                      onClick={() => handleFeedback('not_helpful')}
                      className={`p-1.5 rounded-lg border transition-all ${
                        feedbackRating === 'not_helpful'
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-600'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400'
                      } disabled:opacity-50 cursor-pointer`}
                      title="Not helpful"
                      aria-label="Not helpful"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


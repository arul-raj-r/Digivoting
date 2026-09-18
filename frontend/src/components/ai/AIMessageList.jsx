import React, { useEffect, useRef } from 'react';
import AIMessage from './AIMessage';
import AILoading from './AILoading';
import AIError from './AIError';

/**
 * Message history list container with auto-scroll management and accessibility ARIA region.
 */
export default function AIMessageList({
  messages = [],
  isLoading = false,
  error = null,
  onRetry = null,
}) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  // Auto-scroll to bottom smoothly on message change or loading
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, error]);

  return (
    <div
      ref={containerRef}
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-label="DigiVote Assistant conversation stream"
      className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3 focus:outline-none"
      tabIndex={0}
    >
      {messages.map((msg) => (
        <AIMessage key={msg.id} message={msg} />
      ))}

      {isLoading && <AILoading />}

      {error && <AIError error={error} onRetry={onRetry} />}

      <div ref={bottomRef} aria-hidden="true" className="h-2" />
    </div>
  );
}

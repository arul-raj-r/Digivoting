import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import aiService from '../services/aiService';
import electionApi from '../services/electionApi';
import AIHeader from '../components/ai/AIHeader';
import AIWelcome from '../components/ai/AIWelcome';
import AIMessageList from '../components/ai/AIMessageList';
import AIComposer from '../components/ai/AIComposer';

/**
 * Stage 3 AI Assistant dedicated page.
 * Manages in-memory conversation state, handles real communication with POST /api/ai/chat/,
 * manages optional election context, and renders civic-styled responsive assistant interface.
 */
export default function AIAssistant() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // In-memory conversation state (Section 16 & 17)
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSubmittedQuery, setLastSubmittedQuery] = useState('');

  // Active Election Context (Section 15)
  const [activeElection, setActiveElection] = useState(() => {
    // 1. From query params
    const idFromQuery = searchParams.get('election_id');
    const titleFromQuery = searchParams.get('election_title');
    if (idFromQuery) {
      return { id: idFromQuery, title: titleFromQuery || 'Election Context' };
    }
    // 2. From navigation state
    if (location.state?.election_id) {
      return {
        id: location.state.election_id,
        title: location.state.election_title || 'Election Context',
      };
    }
    return null;
  });

  // Sync state if query params change
  useEffect(() => {
    const qId = searchParams.get('election_id');
    const qTitle = searchParams.get('election_title');
    if (qId && (!activeElection || activeElection.id !== qId)) {
      setActiveElection({ id: qId, title: qTitle || 'Election Context' });
    }
  }, [searchParams]);

  // Clear active election context
  const handleClearElection = () => {
    setActiveElection(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('election_id');
    newParams.delete('election_title');
    setSearchParams(newParams, { replace: true });
  };

  // Reset conversation to fresh welcome state (Section 16)
  const handleNewConversation = () => {
    setMessages([]);
    setError(null);
    setLastSubmittedQuery('');
  };

  // Send message to real backend endpoint
  const handleSendMessage = useCallback(async (queryText) => {
    const trimmed = typeof queryText === 'string' ? queryText.trim() : '';
    if (!trimmed || isLoading) return;

    setError(null);
    setLastSubmittedQuery(trimmed);

    const userMessageId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const userMessage = {
      id: userMessageId,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    // Extract recent conversation turns (max 6) to maintain conversational continuity
    const conversationHistory = messages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-6)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    // Append user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const electionIdToSend = activeElection?.id || null;
      const res = await aiService.sendMessage(trimmed, electionIdToSend, conversationHistory);

      const assistantMessageId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const assistantMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: res.answer,
        sources: Array.isArray(res.sources) ? res.sources : [],
        requestId: res.requestId || null,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('[AIAssistant] Error receiving AI answer:', err.message);
      setError(err.message || 'The DigiVote Assistant is temporarily unavailable.');
    } finally {
      setIsLoading(false);
    }
  }, [activeElection, isLoading, messages]);

  // Retry handler for the last failed query
  const handleRetry = () => {
    if (lastSubmittedQuery) {
      handleSendMessage(lastSubmittedQuery);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-5xl mx-auto rounded-3xl bg-white dark:bg-[#080d19] border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
      
      {/* Top Header with Context Pill & New Chat button */}
      <AIHeader
        activeElection={activeElection}
        onClearElection={handleClearElection}
        onNewConversation={handleNewConversation}
        hasMessages={messages.length > 0}
      />

      {/* Main Conversation Body */}
      {messages.length === 0 ? (
        <AIWelcome
          onSelectPrompt={handleSendMessage}
          activeElectionTitle={activeElection?.title}
        />
      ) : (
        <AIMessageList
          messages={messages}
          isLoading={isLoading}
          error={error}
          onRetry={lastSubmittedQuery ? handleRetry : null}
        />
      )}

      {/* Bottom Composer with accessible input & Send action */}
      <AIComposer
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        placeholder={
          activeElection
            ? `Ask about ${activeElection.title}...`
            : 'Ask DigiVote Assistant about voting, verification, elections...'
        }
      />

    </div>
  );
}

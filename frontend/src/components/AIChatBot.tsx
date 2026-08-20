import React, { useState, useRef, useEffect } from 'react';
import { Bot, MessageSquare, Send, X, RefreshCw } from 'lucide-react';
import { api } from '../utils/api';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}

export const AIChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState<ChatMessage[]>([
    {
      sender: 'bot',
      text: "👋 Welcome to DigiVoting Support! I'm your AI digital assistant. Ask me anything about registration, visual camera audits, voting procedures, or cryptographic double-voting prevention.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of the conversation
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatLog, isOpen]);

  const handleSendMessage = async (customMessage?: string) => {
    const textToSend = customMessage || message;
    if (!textToSend.trim() || loading) return;

    // Add user message to chat log
    const newUserMessage: ChatMessage = { sender: 'user', text: textToSend };
    setChatLog((prev) => [...prev, newUserMessage]);
    
    if (!customMessage) setMessage(''); // Clear input
    setLoading(true);

    try {
      const response = await api.post('/auth/ai-chat/', { message: textToSend });
      const replyText = response.data.reply;
      
      setChatLog((prev) => [...prev, { sender: 'bot', text: replyText }]);
    } catch (err) {
      console.error('Failed to get bot reply:', err);
      setChatLog((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: '⚠️ Sorry, I had trouble connecting to the helper backend. Please check if your server is running.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const suggestions = [
    'How do I vote?',
    'How is double voting prevented?',
    'Where do I find my OTP?',
    'What is visual audit/liveness?',
    'List active elections',
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* Floating Chat Box Panel */}
      {isOpen && (
        <div className="w-[350px] sm:w-[400px] h-[500px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4 transition-all duration-300 scale-100 origin-bottom-right">
          
          {/* Header */}
          <div className="bg-gov-blue dark:bg-slate-950 text-white px-4 py-3 flex items-center justify-between shadow-sm border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="bg-gov-gold/20 p-1.5 rounded-lg">
                <Bot className="h-5 w-5 text-gov-gold animate-bounce" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold tracking-tight">DigiVoting AI Assistant</h4>
                <span className="text-[9px] text-gov-gold uppercase tracking-wider font-extrabold">Online Support</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-slate-50 dark:bg-slate-950/20">
            {chatLog.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-gov-blue text-white rounded-tr-none'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-850 rounded-tl-none text-left'
                  }`}
                  style={{ whiteSpace: 'pre-line' }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2 text-xs text-slate-500 shadow-sm animate-pulse">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-gov-blue dark:text-gov-gold" />
                  Generating support response...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Q&A Suggestions List */}
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/60 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
            {suggestions.map((sug, index) => (
              <button
                key={index}
                onClick={() => handleSendMessage(sug)}
                className="shrink-0 text-[10px] font-bold text-gov-blue dark:text-gov-gold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-full hover:bg-slate-150 dark:hover:bg-slate-750 transition-colors shadow-sm cursor-pointer"
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Message Input Form */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask a question..."
              className="flex-grow px-3.5 py-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl text-xs"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={loading || !message.trim()}
              className="p-2.5 bg-gov-blue hover:bg-gov-darkblue text-white rounded-xl transition-all shadow-md shadow-gov-blue/10 disabled:opacity-40 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>

        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center h-12 w-12 rounded-full bg-gov-blue hover:bg-gov-darkblue text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer border border-gov-gold/20"
        aria-label="Toggle Support Chat"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-5.5 w-5.5 text-gov-gold" />}
      </button>
    </div>
  );
};

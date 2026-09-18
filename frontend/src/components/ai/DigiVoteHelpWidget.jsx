import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Bot, 
  X, 
  ShieldCheck, 
  Scale, 
  BookOpen, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Lock,
  MessageSquare
} from 'lucide-react';

export default function DigiVoteHelpWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <aside aria-label="DigiVote AI Assistant" className="fixed bottom-5 right-5 z-40 select-none">
      {/* 1. Floating AI Assistant Launcher Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-graphite-900 dark:bg-forest-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 border border-graphite-700 dark:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:ring-offset-2"
          aria-label="Open DigiVote AI Assistant"
          title="Open DigiVote AI Assistant Information"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-forest-400 dark:text-white transition-transform group-hover:rotate-6 shrink-0" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-graphite-900" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold tracking-tight">Civic Assistant</span>
            <span className="text-[9px] text-sage-400 dark:text-forest-200 font-mono leading-none">Preview</span>
          </div>
        </button>
      )}

      {/* 2. Institutional "Coming Soon" Modal Panel */}
      {isOpen && (
        <div 
          className="w-[380px] sm:w-[420px] max-w-[94vw] max-h-[85vh] rounded-3xl bg-white dark:bg-graphite-900 border border-sage-200 dark:border-graphite-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
          role="dialog"
          aria-labelledby="digivote-ai-title"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-sage-200 dark:border-graphite-800 bg-sage-50/90 dark:bg-graphite-950/90 backdrop-blur-sm flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-forest-600 text-white flex items-center justify-center shadow-sm shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="digivote-ai-title" className="text-xs font-serif font-bold text-graphite-900 dark:text-ivory leading-tight">
                    DigiVote Civic Assistant
                  </h2>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-600/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>
                <span className="text-[10px] text-graphite-500 dark:text-sage-400 font-medium">
                  Civic Guidance & Neutral Election Engine
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-graphite-400 hover:text-graphite-700 dark:hover:text-sage-200 hover:bg-sage-200/60 dark:hover:bg-graphite-800 transition-colors"
              title="Close Assistant"
              aria-label="Close Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-left">
            {/* Overview Banner */}
            <div className="p-4 rounded-2xl bg-forest-50/70 dark:bg-forest-950/30 border border-forest-200/60 dark:border-forest-900/40">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-4 h-4 text-forest-700 dark:text-forest-400 shrink-0" />
                <h3 className="text-xs font-serif font-bold text-forest-950 dark:text-forest-200">
                  Intelligent Civic Guidance Ready
                </h3>
              </div>
              <p className="text-[11px] text-forest-900/80 dark:text-forest-300/80 leading-relaxed">
                DigiVote features an auditable, neutrality-guaranteed conversational assistant for voters and election administrators. Grounded in election bylaws, voting rules, and neutral civic processes.
              </p>
            </div>

            {/* Core Capability Pillars */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-graphite-400 dark:text-sage-400 font-mono">
                Assistant Capabilities
              </span>

              <div className="grid grid-cols-1 gap-2">
                <div className="p-3 rounded-xl bg-sage-50/60 dark:bg-graphite-950 border border-sage-200/70 dark:border-graphite-800 flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-forest-50 dark:bg-forest-950/50 text-forest-700 dark:text-forest-400 shrink-0">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-graphite-800 dark:text-sage-200">
                      Bylaws & RAG Knowledge Lookup
                    </h4>
                    <p className="text-[11px] text-graphite-600 dark:text-sage-400 leading-relaxed mt-0.5">
                      Grounds answers directly in uploaded organizational bylaws, voting guidelines, and election charters with verifiable citations.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-sage-50/60 dark:bg-graphite-950 border border-sage-200/70 dark:border-graphite-800 flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-forest-50 dark:bg-forest-950/50 text-forest-700 dark:text-forest-400 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-graphite-800 dark:text-sage-200">
                      Voter Process & Eligibility Support
                    </h4>
                    <p className="text-[11px] text-graphite-600 dark:text-sage-400 leading-relaxed mt-0.5">
                      Assists voters with registration steps, roster verification status, credential requirements, and confidential ballot procedures.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-sage-50/60 dark:bg-graphite-950 border border-sage-200/70 dark:border-graphite-800 flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-forest-50 dark:bg-forest-950/50 text-forest-700 dark:text-forest-400 shrink-0">
                    <Scale className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-graphite-800 dark:text-sage-200">
                      Strict Neutrality Guardrails
                    </h4>
                    <p className="text-[11px] text-graphite-600 dark:text-sage-400 leading-relaxed mt-0.5">
                      Hard-coded civic neutrality rules prohibit endorsing candidates, expressing political preferences, or influencing ballot choices.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Launch to Full Assistant */}
            <div className="p-3.5 rounded-2xl bg-forest-50/80 dark:bg-forest-950/40 border border-forest-200 dark:border-forest-800 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-graphite-800 dark:text-sage-200">Need instant help?</span>
                <span className="text-[10px] text-forest-700 dark:text-forest-300 font-mono">Gemini RAG Engine</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/ai-assistant');
                }}
                className="w-full py-2 px-3 rounded-xl bg-forest-600 hover:bg-forest-700 active:bg-forest-800 text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Launch Full Civic Assistant
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Security note */}
            <div className="flex items-center gap-2 text-[10px] text-graphite-500 dark:text-sage-400 px-1">
              <Lock className="w-3.5 h-3.5 shrink-0 text-graphite-400" />
              <span>Ballot secrecy and cryptographic integrity are never exposed to AI models.</span>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-sage-200 dark:border-graphite-800 bg-sage-50/80 dark:bg-graphite-950/80 flex items-center justify-between shrink-0">
            <Link
              to="/help"
              onClick={() => setIsOpen(false)}
              className="text-xs font-medium text-forest-700 dark:text-forest-400 hover:underline"
            >
              Browse Help & FAQ
            </Link>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-1.5 rounded-xl bg-sage-200 hover:bg-sage-300 dark:bg-graphite-800 dark:hover:bg-graphite-700 text-graphite-700 dark:text-sage-300 text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

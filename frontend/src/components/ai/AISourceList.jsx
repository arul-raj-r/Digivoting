import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, FileText } from 'lucide-react';

/**
 * Renders citation sources returned by the Pinecone RAG knowledge retrieval backend.
 * Visually subtle, clean civic portal styling. Never reveals raw embeddings or vector IDs.
 */
export default function AISourceList({ sources = [] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!Array.isArray(sources) || sources.length === 0) {
    return null;
  }

  // Filter and sanitize source objects
  const validSources = sources.filter(
    (item) => item && (typeof item.source === 'string' || typeof item.title === 'string')
  );

  if (validSources.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-800/80 text-xs">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-slate-500 hover:text-slate-750 dark:text-slate-400 dark:hover:text-slate-200 transition-colors font-medium text-[11px] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-1 -ml-1"
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Hide' : 'Show'} ${validSources.length} source references`}
      >
        <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
        <span className="font-semibold">Sources ({validSources.length})</span>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 opacity-70" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 opacity-70" />
        )}
      </button>

      {isExpanded && (
        <ul className="mt-2 space-y-1.5 pl-1" aria-label="Reference sources list">
          {validSources.map((item, index) => {
            const rawTitle = item.source || item.title || 'Official Document';
            // Clean filename if it includes directory prefixes
            const cleanTitle = rawTitle.split(/[/\\]/).pop();
            const pageNumber = item.page != null ? item.page : null;

            return (
              <li
                key={index}
                className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-[11px] bg-slate-100/70 dark:bg-slate-800/50 rounded-lg px-2.5 py-1.5 border border-slate-200/60 dark:border-slate-700/50"
              >
                <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="font-medium truncate">{cleanTitle}</span>
                {pageNumber != null && (
                  <span className="text-slate-400 dark:text-slate-500 shrink-0 font-mono text-[10px]">
                    · Page {pageNumber}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

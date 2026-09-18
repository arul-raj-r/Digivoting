import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Home, LayoutDashboard, ArrowLeft, RotateCcw, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function NotFound({ 
  code = '404', 
  title = 'Page Not Found', 
  message = 'The requested resource could not be found or may have been moved.',
  onRetry = null
}) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 transition-colors">
      <div className="max-w-md w-full text-center space-y-6">
        
        {/* Brand Shield & Error Code */}
        <div className="space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-600/20 flex items-center justify-center mx-auto shadow-sm">
            <Shield className="w-8 h-8" />
          </div>
          <span className="inline-block text-xs font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            ERROR {code}
          </span>
        </div>

        {/* Heading & Explanation */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          ) : user ? (
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Go to Dashboard</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all"
            >
              <Lock className="w-4 h-4" />
              <span>Sign In to DigiVote</span>
            </Link>
          )}

          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>

        {/* Security & System Note */}
        <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-4">
          DigiVote Secure Digital Voting System • Institutional Audit Log Protected
        </p>

      </div>
    </div>
  );
}

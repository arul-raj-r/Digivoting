import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export default function RoleRoute({ children, allowedRoles = ['ADMIN', 'ELECTION_CREATOR', 'ORGANIZER'] }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4 p-8 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Authentication Required
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            You must sign in with verified institutional credentials to access this election workspace.
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/25"
            >
              <span>Go to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const role = user?.role || 'VOTER';
  const isAuthorized = 
    allowedRoles.includes(role) || 
    user?.is_staff || 
    user?.is_superuser ||
    (allowedRoles.includes('ORGANIZER') && role === 'ELECTION_CREATOR');

  if (!isAuthorized) {
    return (
      <div className="min-h-[65vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-5 p-8 rounded-2xl bg-white dark:bg-[#0d1527] border border-rose-200 dark:border-rose-900/40 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 uppercase tracking-wider">
              HTTP 403: FORBIDDEN
            </span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Access Denied
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Your account role (<span className="font-mono font-bold text-slate-700 dark:text-slate-200">{role}</span>) does not have authorization to access this operational module. This module requires <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{allowedRoles.join(' or ')}</span> permissions.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/25"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

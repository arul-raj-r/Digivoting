// Dev-only Role Switcher
// Strictly gated behind import.meta.env.DEV to prevent any security boundary blur in production
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { mockStore, useMockStore } from '../../mockData/mockStore';
import { UserCheck, ShieldCheck } from 'lucide-react';

export default function RoleSwitcher() {
  if (!import.meta.env.DEV) {
    return null;
  }

  const navigate = useNavigate();
  const activeRole = useMockStore(state => state.activeRole);

  const handleRoleChange = (newRole) => {
    if (newRole === activeRole) return;
    mockStore.setActiveRole(newRole);
    if (newRole === 'ELECTION_CREATOR') {
      navigate('/creator/elections');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider px-1.5 hidden sm:inline">
        Dev Role:
      </span>
      <button
        type="button"
        onClick={() => handleRoleChange('VOTER')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
          activeRole === 'VOTER'
            ? 'bg-white dark:bg-slate-900 text-gov-navy dark:text-sky-400 shadow-sm font-bold'
            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <UserCheck className="w-3.5 h-3.5" />
        <span>Voter Portal</span>
      </button>

      <button
        type="button"
        onClick={() => handleRoleChange('ELECTION_CREATOR')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all ${
          activeRole === 'ELECTION_CREATOR'
            ? 'bg-white dark:bg-slate-900 text-gov-navy dark:text-sky-400 shadow-sm font-bold'
            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Creator Dashboard</span>
      </button>
    </div>
  );
}

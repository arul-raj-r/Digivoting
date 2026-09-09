// Dev-only State Simulator Floating Toolbar
// Strictly gated behind import.meta.env.DEV to prevent any exposure in production
import React from 'react';
import { mockStore, useMockStore } from '../../mockData/mockStore';
import { Wrench, RefreshCw, Layers } from 'lucide-react';

export default function StateSimulatorBar() {
  // Hard guard for production builds
  if (!import.meta.env.DEV) {
    return null;
  }

  const { simulatedState, activeRole } = useMockStore(state => ({
    simulatedState: state.simulatedState,
    activeRole: state.activeRole
  }));

  const states = [
    { key: 'default', label: 'Normal / Real' },
    { key: 'loading', label: '1. Loading' },
    { key: 'success', label: '2. Success' },
    { key: 'error', label: '3. Error' },
    { key: 'empty', label: '4. Empty' },
    { key: 'disabled', label: '5. Disabled' }
  ];

  return (
    <aside aria-label="Developer testing toolbar" className="fixed bottom-3 right-3 z-50 flex items-center gap-2 bg-slate-900/95 backdrop-blur-md text-white px-3 py-2 rounded-xl shadow-2xl border border-amber-500/40 text-xs">
      <div className="flex items-center gap-1.5 font-semibold text-amber-400 mr-1">
        <Wrench className="w-3.5 h-3.5" />
        <span className="uppercase tracking-wider text-[10px]">Dev Tools</span>
      </div>

      <div className="h-4 w-px bg-slate-700" />

      <div className="flex items-center gap-1">
        <span className="text-slate-400 text-[11px] mr-1 flex items-center gap-1">
          <Layers className="w-3 h-3" /> State:
        </span>
        {states.map(s => (
          <button
            key={s.key}
            type="button"
            onClick={() => mockStore.setSimulatedState(s.key)}
            className={`px-2 py-1 rounded font-medium transition-all text-[11px] ${
              simulatedState === s.key
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-slate-700" />

      <button
        type="button"
        title="Reset mock data to initial seeds"
        onClick={() => {
          mockStore.resetToInitial();
          window.location.reload();
        }}
        className="flex items-center gap-1 text-slate-400 hover:text-white px-1.5 py-1 rounded hover:bg-slate-800 transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        <span className="text-[10px]">Reset Data</span>
      </button>
    </aside>
  );
}

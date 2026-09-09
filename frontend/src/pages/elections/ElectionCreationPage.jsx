import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  PlusCircle, 
  Layers, 
  Users, 
  Calendar, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight,
  Info,
  Lock,
  FileText
} from 'lucide-react';

export default function ElectionCreationPage() {
  const [activeTab, setActiveTab] = useState('details');

  const steps = [
    { id: 'details', label: 'Election Details', icon: FileText, desc: 'Title, description, and institutional jurisdiction' },
    { id: 'type', label: 'Election Type', icon: Layers, desc: 'Single-choice, preferential, or multi-seat election' },
    { id: 'candidates', label: 'Candidates Slate', icon: Users, desc: 'Candidate profiles, manifestos, and affiliations' },
    { id: 'voters', label: 'Voter Roster', icon: Users, desc: 'Eligible voter registry and CSV bulk import' },
    { id: 'verification', label: 'Verification Protocol', icon: ShieldCheck, desc: 'Email OTP and Webcam Face Recognition parameters' },
    { id: 'schedule', label: 'Schedule & Rules', icon: Calendar, desc: 'Start, end date/times, and results visibility locks' },
    { id: 'review', label: 'Review & Publish', icon: CheckCircle2, desc: 'Cryptographic pre-flight verification and launch' }
  ];

  return (
    <div className="space-y-6 pb-16">
      
      {/* Header Banner */}
      <div className="rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold font-mono">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>MODULE: ELECTION CREATION</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Create & Configure Election
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Design new institutional elections with customizable candidate slates, eligibility rolls, and multi-factor biometric verification rules.
            </p>
          </div>

          <Link
            to="/creator/elections/new"
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all shrink-0"
          >
            <span>Launch Wizard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Workflow Navigation Steps Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = activeTab === step.id;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveTab(step.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                isActive
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                  : 'bg-white dark:bg-[#0d1527] border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] font-bold text-slate-400">
                  STEP 0{idx + 1}
                </span>
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              </div>
              <h3 className={`text-xs font-bold ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                {step.label}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                {step.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Step Container / Empty State */}
      <div className="rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-200 dark:border-indigo-800/60">
          <Layers className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto space-y-1.5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {steps.find(s => s.id === activeTab)?.label}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {steps.find(s => s.id === activeTab)?.desc}. Detailed configuration fields are managed through the step-by-step creation wizard.
          </p>
        </div>

        <div className="pt-2 flex justify-center gap-3">
          <Link
            to="/creator/elections/new"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all"
          >
            <span>Proceed to Election Creator</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/election-management"
            className="inline-flex items-center gap-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-xl text-xs font-semibold transition-colors"
          >
            <span>View Active Elections</span>
          </Link>
        </div>
      </div>

    </div>
  );
}

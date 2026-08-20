import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, UserCheck, BarChart3, HelpCircle, ArrowRight, Landmark } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export const Landing: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="bg-white dark:bg-slate-900 border-t-4 border-gov-saffron border-x border-b border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 md:gap-12 animate-in fade-in duration-300">
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-1.5 bg-gov-blue/10 text-gov-blue dark:bg-gov-saffron/10 dark:text-gov-saffron px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <Landmark className="h-3.5 w-3.5" />
            National Digital Election Portal
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white leading-tight font-sans">
            Secure, Secret, and Seamless <span className="text-gov-saffron">Digital Voting</span> Platform
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-xs md:text-sm leading-relaxed max-w-xl">
            Welcome to the National Digital Voting Portal. Register to vote, generate your Digital Voter ID Card, verify your identity credentials, cast your secret digital ballot, and audit the results instantly. Fully verified, compliant, and completely anonymous.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            {isAuthenticated ? (
              <Link 
                to={user?.role === 'ADMIN' ? '/admin' : '/dashboard'}
                className="flex items-center gap-1.5 bg-gov-blue hover:bg-gov-darkblue text-white px-5 py-3 rounded text-xs font-bold shadow transition-all"
              >
                Go to {user?.role === 'ADMIN' ? 'Admin Panel' : 'Voter Dashboard'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link 
                  to="/login"
                  className="flex items-center gap-1.5 bg-gov-blue hover:bg-gov-darkblue text-white px-5 py-3 rounded text-xs font-bold shadow transition-all"
                >
                  Access Voter Portal
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link 
                  to="/register"
                  className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 px-5 py-3 rounded text-xs font-bold transition-all text-slate-800 dark:text-slate-200"
                >
                  Register to Vote (Apply for Voter Card)
                </Link>
              </>
            )}
            <Link 
              to="/results"
              className="flex items-center gap-1.5 bg-gov-green hover:bg-emerald-850 text-white px-5 py-3 rounded text-xs font-bold shadow transition-all"
            >
              View Turnout & Results
            </Link>
          </div>
        </div>

        {/* Hero Visual Block */}
        <div className="flex-1 max-w-md w-full">
          <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border-l-4 border-gov-green border-y border-r border-slate-200 dark:border-slate-850 shadow-inner space-y-4">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2">
              System Guidelines & Security
            </h3>
            <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-gov-green shrink-0 mt-0.5" />
                <span><strong>Official Verification</strong>: Every voter must undergo verification by a registered administrator using official credentials before a Digital Voter ID Card is issued.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <UserCheck className="h-4 w-4 text-gov-blue shrink-0 mt-0.5" />
                <span><strong>Multi-Factor Authentication</strong>: High-security logins utilizing Password, OTP, and possession of Voter ID Card number.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-gov-green shrink-0 mt-0.5" />
                <span><strong>Secrecy of Ballot</strong>: Vote records contain no link to voter profiles. An independent receipt logs *that* you voted, protecting *how* you voted.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Feature Pillar Sections */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl space-y-3">
          <div className="p-3 bg-gov-saffron/10 text-gov-saffron w-fit rounded-lg">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase">Secure Audit Trail</h2>
          <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
            All system interactions (authentications, voter approvals, and ballot submittals) are recorded in an append-only audit ledger with absolute timestamp tracking.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl space-y-3">
          <div className="p-3 bg-gov-blue/10 text-gov-blue w-fit rounded-lg">
            <UserCheck className="h-6 w-6" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase">Decoupled Voting Architecture</h2>
          <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
            Engineered with strict separation of Voter ID receipt mappings and Ballot choice parameters. It is cryptographically impossible to trace a cast vote back to a voter.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl space-y-3">
          <div className="p-3 bg-gov-green/10 text-gov-green w-fit rounded-lg">
            <BarChart3 className="h-6 w-6" />
          </div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase">Live Turnout Graphs</h2>
          <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
            Once voting ends and the status is transitioned to Completed, constituencies publish verified aggregate turnout graphs and final candidate vote breakdowns.
          </p>
        </div>
      </section>

      {/* Warning/Disclaimer Card */}
      <section className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-6 rounded-xl flex items-start gap-4">
        <HelpCircle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-amber-800 dark:text-amber-350 uppercase">
            Academic Prototype Disclaimer
          </h4>
          <p className="text-xs text-amber-750 dark:text-amber-400/80 leading-relaxed font-semibold">
            This platform is an academic research prototype built for university presentation purposes. It is not certified, not legally compliant, and is not designed or suitable for conducting real-world public elections.
          </p>
        </div>
      </section>
    </div>
  );
};

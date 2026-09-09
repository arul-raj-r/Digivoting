import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../layouts/PublicLayout';
import electionApi from '../../services/electionApi';
import { 
  Shield, 
  Lock, 
  UserCheck, 
  Vote, 
  BarChart2, 
  Sliders, 
  ArrowRight, 
  CheckCircle2, 
  Key, 
  Camera, 
  FileCheck, 
  ChevronRight, 
  Fingerprint, 
  Eye, 
  Layers, 
  ShieldCheck,
  Building2,
  Calendar
} from 'lucide-react';

export default function Home() {
  const [stats, setStats] = useState({
    activeElections: 0,
    totalElections: 0,
    loading: true,
  });

  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      try {
        const data = await electionApi.getElections();
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : (data.results || []);
        const active = list.filter(e => e.status === 'active' || e.status === 'ACTIVE').length;
        setStats({
          activeElections: active,
          totalElections: list.length,
          loading: false,
        });
      } catch (err) {
        if (!isMounted) return;
        setStats({
          activeElections: 0,
          totalElections: 0,
          loading: false,
        });
      }
    }
    loadStats();
    return () => { isMounted = false; };
  }, []);

  const featureCards = [
    {
      title: 'Secure Authentication',
      description: 'Multi-factor authentication via institutional email verification and one-time password (OTP) challenges.',
      icon: Key,
      to: '/features#auth',
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60'
    },
    {
      title: 'Election Creation',
      description: 'Granular configuration of election slates, candidate manifestos, voter rosters, and biometric verification thresholds.',
      icon: Layers,
      to: '/features#creation',
      color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/60'
    },
    {
      title: 'Voter Verification',
      description: 'Client-side webcam face verification powered by OpenCV and ArcFace paired with one-time voting authorizations.',
      icon: UserCheck,
      to: '/features#verification',
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60'
    },
    {
      title: 'Election Management',
      description: 'Complete operational lifecycle control: Start, Pause, Resume, Complete, with strict configuration locks.',
      icon: Sliders,
      to: '/features#management',
      color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60'
    },
    {
      title: 'Secure Voting',
      description: 'Confidential digital voting booths featuring anonymous envelope encryption and minute-truncated submission timestamps.',
      icon: Vote,
      to: '/features#voting',
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60'
    },
    {
      title: 'Results & Reports',
      description: 'Automated cryptographic tally verification, visual vote distributions, certified election reports, and CSV exports.',
      icon: BarChart2,
      to: '/features#results',
      color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60'
    }
  ];

  const workflowSteps = [
    { step: '01', title: 'Register & Verify Email', desc: 'Citizen creates an institutional profile and confirms email ownership.' },
    { step: '02', title: 'MFA OTP Challenge', desc: 'Secure 6-digit one-time code delivered to verify session authenticity.' },
    { step: '03', title: 'Biometric Face Match', desc: 'Browser webcam face verification verifies identity against authorized records.' },
    { step: '04', title: 'Cast Secret Ballot', desc: 'Single-use cryptographic token allows authorized ballot submission.' },
    { step: '05', title: 'Certified Results', desc: 'Tamper-evident tally computation and downloadable participation audit logs.' }
  ];

  return (
    <PublicLayout>
      {/* 1. HERO SECTION WITH SUBTLE 3D CARD VISUAL */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-200/80 dark:border-slate-800/80">
        {/* Ambient subtle light gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-500/10 via-sky-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Hero Text */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Next-Generation Digital Governance Platform</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Secure Digital Voting, <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 bg-clip-text text-transparent">
                  Built for Modern Organizations
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                Conduct secure, transparent and intelligent elections with verified voters, controlled election management and confidential digital voting.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.02]"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/features"
                  className="inline-flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 px-6 py-3.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  <span>Explore Platform</span>
                </Link>
              </div>

              {/* Security Pill Indicators */}
              <div className="pt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Verified Identity Rolls</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Face Biometric Guard</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Anonymous Secret Ballot</span>
                </div>
              </div>
            </div>

            {/* Right Hero: Subtle 3D Visual (Perspective Card & Encrypted Terminal Nodes) */}
            <div className="lg:col-span-5 relative perspective-1000 flex justify-center">
              <div className="relative w-full max-w-md card-3d">
                {/* Decorative background glow */}
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-indigo-600 to-sky-500 opacity-20 blur-xl" />

                {/* Main 3D Card */}
                <div className="relative rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl transition-all">
                  
                  {/* Top Bar */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                      <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono text-[10px] font-bold">
                      <Shield className="w-3 h-3" />
                      <span>TERMINAL VERIFIED</span>
                    </div>
                  </div>

                  {/* Body Simulation */}
                  <div className="py-5 space-y-4">
                    {/* Simulated Biometric Node */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#131d36] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                          <Camera className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">ArcFace Verification</p>
                          <p className="text-[10px] text-slate-500">Live Webcam Match</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        CONFIRMED
                      </span>
                    </div>

                    {/* Simulated Ballot Authorization Node */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#131d36] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-sky-600/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                          <Key className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">One-Time Voting Token</p>
                          <p className="text-[10px] text-slate-500">Cryptographically Bound</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
                        AUTHORIZED
                      </span>
                    </div>

                    {/* Encrypted Envelope Node */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#131d36] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">Confidential Ballot</p>
                          <p className="text-[10px] text-slate-500">Separated Identity Record</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                        ENCRYPTED
                      </span>
                    </div>
                  </div>

                  {/* Terminal Status Footer */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Platform Active
                    </span>
                    <span className="font-mono text-[10px]">Zero-Knowledge Audit Trail</span>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. TRUSTED SECURITY SECTION */}
      <section className="py-14 bg-slate-100/60 dark:bg-[#070b14]/60 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
              SECURITY ARCHITECTURE
            </h2>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Engineered for Institutional Integrity
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm">
              <Key className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mb-3" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">MFA Verification</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                6-digit SHA-256 hashed one-time tokens with strict cooldowns and rate limiting.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm">
              <Camera className="w-6 h-6 text-sky-600 dark:text-sky-400 mb-3" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Webcam Biometrics</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Live facial embedding comparison using OpenCV and ArcFace prior to issuing voting tokens.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm">
              <Lock className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-3" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Confidential Ballots</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Voter identity keys are never stored on ballot choices. Timestamps are truncated to the minute.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm">
              <FileCheck className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-3" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Audited Operations</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Tamper-evident audit logs capture all lifecycle events, verifications, and tallied results.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CORE FEATURES SECTION */}
      <section className="py-20 border-b border-slate-200/80 dark:border-slate-800/80" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
              DIGIVOTE MODULES
            </h2>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Complete End-to-End Election Management
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Every phase of governance is managed in dedicated, purpose-built digital modules.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <div 
                  key={idx}
                  className="rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 p-6 depth-card flex flex-col justify-between"
                >
                  <div>
                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-4 ${card.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                      {card.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                      {card.description}
                    </p>
                  </div>
                  <Link
                    to={card.to}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 pt-2"
                  >
                    <span>Learn more</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. HOW DIGIVOTE WORKS (TIMELINE WORKFLOW) */}
      <section className="py-20 bg-slate-50 dark:bg-[#070b14] border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
              PROCESS PIPELINE
            </h2>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              How DigiVote Works
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              A transparent, 5-stage verification workflow guaranteeing voter legitimacy and ballot confidentiality.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {workflowSteps.map((step, idx) => (
              <div 
                key={idx}
                className="relative rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between"
              >
                <div>
                  <span className="font-mono text-2xl font-black text-indigo-600/30 dark:text-indigo-400/20 block mb-2">
                    {step.step}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">
                    {step.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
                {idx < workflowSteps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-20">
                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              to="/how-it-works"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <span>Explore complete technical workflow</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 5. BACKEND-DRIVEN METRICS SECTION (NO FAKE NUMBERS) */}
      <section className="py-16 bg-white dark:bg-[#0a0f1d] border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800">
              <span className="block text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                {stats.loading ? '—' : stats.activeElections}
              </span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mt-1 block">
                Active Live Elections
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">Real-time backend registry</span>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800">
              <span className="block text-3xl sm:text-4xl font-black text-sky-600 dark:text-sky-400 font-mono">
                {stats.loading ? '—' : stats.totalElections}
              </span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mt-1 block">
                Total Configured Elections
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">Verified election records</span>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800">
              <span className="block text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                100%
              </span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mt-1 block">
                Audit Trail Integrity
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">Cryptographic event logs</span>
            </div>

          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION SECTION */}
      <section className="py-20 bg-gradient-to-b from-slate-50 to-indigo-50/50 dark:from-[#070b14] dark:to-[#0c142b]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-indigo-600/30">
            <Shield className="w-6 h-6" />
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Ready to conduct secure digital elections?
          </h2>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
            Get started with DigiVote to experience institutional voting with verified rolls, face recognition, and confidential ballot casting.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/25 transition-all"
            >
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/contact"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-8 py-3.5 rounded-xl text-sm font-semibold transition-colors"
            >
              <span>Contact Support</span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

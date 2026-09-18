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
  FileCheck, 
  Layers, 
  ShieldCheck,
  Building2,
  Calendar,
  QrCode
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
        const active = list.filter(e => ['active', 'live'].includes((e.status || '').toLowerCase())).length;
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
      title: 'Verified voter rosters',
      description: 'Strict eligibility enforcement via authorized CSV rosters. General user registration alone does not grant ballot access.',
      icon: UserCheck,
    },
    {
      title: 'Confidential ballot secrecy',
      description: 'Cast ballot selections are permanently decoupled from voter identities. Even election administrators cannot associate votes with individuals.',
      icon: Lock,
    },
    {
      title: 'Two-factor authentication',
      description: 'Identity verification via email OTP challenges and optional presence verification before ballot access is granted.',
      icon: Key,
    },
    {
      title: 'Lifecycle control & locks',
      description: 'Charter drafting, candidate registration, scheduling, live pausing, and permanent configuration freezing once voting starts.',
      icon: Sliders,
    },
    {
      title: 'Instant QR code voting',
      description: 'High-resolution printable QR codes directing camera phones immediately to the verified ballot portal for seamless access.',
      icon: QrCode,
    },
    {
      title: 'Certified tallies & audit logs',
      description: 'Immutable participation audit trail and automated result computation with official PDF and CSV export options.',
      icon: BarChart2,
    }
  ];

  const workflowSteps = [
    { step: '01', title: 'Upload voter roster', desc: 'Election organizer uploads authorized eligible voters with email, name, and student ID.' },
    { step: '02', title: 'Schedule & configure', desc: 'Set candidate choices, ballot instructions, and strict opening/closing timestamps.' },
    { step: '03', title: 'Publish & generate QR', desc: 'A secure QR code and direct link are generated for distribution to eligible members.' },
    { step: '04', title: 'Cast confidential ballot', desc: 'Voters authenticate with their roster email and cast an irreversibly decoupled ballot.' },
    { step: '05', title: 'Certified tally & export', desc: 'Upon conclusion, results and participation tallies are tabulated and published.' }
  ];

  return (
    <PublicLayout>
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 border-b border-stone-200 dark:border-[#262a33] font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-emerald-50 dark:bg-[#1a4231]/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-300 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>Institutional Electoral Infrastructure</span>
              </div>

              <h1 className="font-serif text-3xl sm:text-5xl font-bold text-stone-900 dark:text-white tracking-tight leading-tight">
                Digital voting platform for organizations & universities
              </h1>

              <p className="text-base sm:text-lg text-stone-600 dark:text-stone-300 max-w-xl leading-relaxed">
                Conduct verified, confidential, and tamper-evident elections. Built for student councils, academic institutions, and organizations that require trusted governance.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/available-elections"
                  className="inline-flex items-center gap-2 bg-[#1a4231] hover:bg-[#1f4f3b] text-white px-5 py-3 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  <Vote className="w-4 h-4" />
                  <span>Explore available elections</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  to="/elections/create"
                  className="inline-flex items-center gap-2 bg-white dark:bg-[#171a20] hover:bg-stone-50 dark:hover:bg-[#101216] text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-[#262a33] px-5 py-3 rounded-lg text-xs font-semibold transition-colors"
                >
                  <span>Create an election</span>
                </Link>

                <Link
                  to="/how-it-works"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline px-3 py-2"
                >
                  <span>Learn how it works →</span>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-4 border-t border-stone-200 dark:border-[#262a33] flex flex-wrap items-center gap-6 text-xs text-stone-500 dark:text-stone-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Roster Whitelist Protection</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Confidential Ballot Segregation</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Instant QR Code Access</span>
                </div>
              </div>
            </div>

            {/* Right Column: Platform Architecture Preview Card */}
            <div className="lg:col-span-5">
              <div className="rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] p-6 shadow-xs space-y-5">
                
                <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-[#262a33]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-serif font-bold text-stone-900 dark:text-white">
                      Active Platform Telemetry
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-[#1a4231]/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60 font-semibold uppercase">
                    Operational
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-lg bg-stone-50 dark:bg-[#101216] border border-stone-200 dark:border-[#262a33] space-y-1">
                    <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">
                      Active contests
                    </span>
                    <div className="text-2xl font-serif font-bold text-stone-900 dark:text-white">
                      {stats.loading ? '—' : stats.activeElections}
                    </div>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Live for voting</span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-stone-50 dark:bg-[#101216] border border-stone-200 dark:border-[#262a33] space-y-1">
                    <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">
                      Total elections
                    </span>
                    <div className="text-2xl font-serif font-bold text-stone-900 dark:text-white">
                      {stats.loading ? '—' : stats.totalElections}
                    </div>
                    <span className="text-[10px] text-stone-500">Administered</span>
                  </div>
                </div>

                {/* Ballot Secrecy Architecture Diagram */}
                <div className="p-4 rounded-lg bg-stone-50 dark:bg-[#101216] border border-stone-200 dark:border-[#262a33] space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-800 dark:text-stone-200">
                    <span>Ballot Decoupling Architecture</span>
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">ENFORCED</span>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] flex items-center justify-between">
                      <span className="text-stone-600 dark:text-stone-300 font-mono text-[11px]">Voter Roster Table</span>
                      <span className="text-emerald-700 text-[10px] font-semibold">has_voted: TRUE</span>
                    </div>
                    <div className="flex justify-center text-stone-400 text-xs font-mono">
                      <span>↓ Permanent Identity Segregation</span>
                    </div>
                    <div className="p-2 rounded bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] flex items-center justify-between">
                      <span className="text-stone-600 dark:text-stone-300 font-mono text-[11px]">Anonymous Ballot Table</span>
                      <span className="text-stone-500 text-[10px]">No User FK</span>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-1">
                  <Link
                    to="/register"
                    className="text-xs font-semibold text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white underline"
                  >
                    Register your institution account →
                  </Link>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CORE CAPABILITIES GRID */}
      <section className="py-16 lg:py-20 border-b border-stone-200 dark:border-[#262a33] bg-white dark:bg-[#171a20]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Institutional Governance Standards
            </span>
            <h2 className="font-serif text-2xl sm:text-4xl font-bold text-stone-900 dark:text-white">
              Engineered for absolute voting trust
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
              DigiVote provides all the tools required to run verified elections without the vulnerabilities of paper ballots or unverified online forms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureCards.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-xl bg-stone-50 dark:bg-[#101216] border border-stone-200 dark:border-[#262a33] space-y-3 hover:border-emerald-600/40 transition-all"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-[#1a4231]/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center border border-emerald-200 dark:border-emerald-800/60">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif text-base font-bold text-stone-900 dark:text-white">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* HOW IT WORKS: STEP-BY-STEP WORKFLOW */}
      <section className="py-16 lg:py-20 border-b border-stone-200 dark:border-[#262a33] bg-[#f7f5f0] dark:bg-[#101216]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Transparent Operation
            </span>
            <h2 className="font-serif text-2xl sm:text-4xl font-bold text-stone-900 dark:text-white">
              How DigiVote elections work
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
              Five clear steps from initial charter definition to final certified results.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {workflowSteps.map((ws, idx) => (
              <div
                key={idx}
                className="p-5 rounded-xl bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] space-y-3 shadow-xs"
              >
                <div className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-400">
                  {ws.step}
                </div>
                <h4 className="font-serif text-sm font-bold text-stone-900 dark:text-white">
                  {ws.title}
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                  {ws.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* CALL TO ACTION BANNER */}
      <section className="py-16 bg-[#171a20] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="w-12 h-12 rounded-xl bg-[#1a4231] text-emerald-300 flex items-center justify-center mx-auto border border-emerald-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-2 max-w-xl mx-auto">
            <h2 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight">
              Ready to conduct your institutional election?
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
              Create an account with your institutional email to manage elections or participate as a verified voter.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#1a4231] hover:bg-[#1f4f3b] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <span>Get started with DigiVote</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-stone-700 hover:bg-[#101216] text-white text-xs font-semibold transition-colors"
            >
              <span>Sign in to account</span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../layouts/PublicLayout';
import { 
  Key, 
  Layers, 
  UserCheck, 
  Sliders, 
  Vote, 
  BarChart2, 
  Check, 
  ArrowRight,
  ShieldCheck,
  Camera,
  FileSpreadsheet,
  Lock
} from 'lucide-react';

export default function Features() {
  const modules = [
    {
      id: 'auth',
      title: 'Secure Authentication',
      icon: Key,
      badge: 'Identity Proofing',
      color: 'indigo',
      description: 'Zero-trust citizen login pipeline coordinating credential validation, institutional email confirmation, and 6-digit MFA OTPs.',
      capabilities: [
        'Email + Password with PBKDF2 / Argon2 hashing',
        'Google OAuth 2.0 institutional integration',
        'Email verification token redemption with cooldown',
        '6-digit OTP MFA with attempt throttling and SHA-256 code hashing',
        'JWT token refresh with server-side session revocation tracking'
      ]
    },
    {
      id: 'creation',
      title: 'Election Creation',
      icon: Layers,
      badge: 'Election Ops',
      color: 'sky',
      description: 'Comprehensive multi-stage election designer allowing organizers to specify election slates, rosters, schedules, and verification protocols.',
      capabilities: [
        'Election metadata, type, and constituency categorization',
        'Candidate roster configuration with photos and manifestos',
        'Voter roll import via CSV bulk upload or manual entry',
        'Customizable identity challenges (Email OTP, Webcam Face Recognition)',
        'Pre-launch verification validation and configuration locks'
      ]
    },
    {
      id: 'verification',
      title: 'Voter Verification',
      icon: UserCheck,
      badge: 'Biometric Ready',
      color: 'emerald',
      description: 'Real-time multi-factor voter verification portal executing webcam facial matching and issuing single-use voting authorization tokens.',
      capabilities: [
        'Election voter roll eligibility validation',
        'High-security Email OTP verification challenge',
        'Browser-based live webcam stream capture with liveness frame checks',
        'Face embedding comparison powered by OpenCV / ArcFace models',
        'Single-use cryptographically bound voting authorization tokens'
      ]
    },
    {
      id: 'management',
      title: 'Election Management',
      icon: Sliders,
      badge: 'Operational Control',
      color: 'purple',
      description: 'Central operational cockpit for organizers to supervise elections, trigger lifecycle state transitions, and monitor live turnout.',
      capabilities: [
        'State lifecycle transitions: Start, Pause, Resume, and Complete',
        'Permanent configuration lock when election transitions to Active',
        'Real-time turnout tracking and voter check-in monitoring',
        'Suspicious access detection and security audit event streams',
        'Emergency pause controls with required reason logging'
      ]
    },
    {
      id: 'voting',
      title: 'Confidential Voting Booth',
      icon: Vote,
      badge: 'Secret Ballot',
      color: 'amber',
      description: 'Streamlined, mobile-responsive ballot interface designed for absolute privacy, preventing multi-casting and coercion.',
      capabilities: [
        'Voting authorization token verification prior to ballot presentation',
        'Mobile-friendly candidate slate display with party affiliations',
        'Two-step vote review and confirmation modal',
        'Envelope encryption of voter choices using per-election keys',
        'Minute-truncated submission timestamps to protect voter anonymity'
      ]
    },
    {
      id: 'results',
      title: 'Results & Reports',
      icon: BarChart2,
      badge: 'Certified Tallies',
      color: 'rose',
      description: 'Automated vote tabulation engine providing cryptographic integrity verification, visual result charts, and certified exportable reports.',
      capabilities: [
        'One-click automated tally computation directly from encrypted ballots',
        'Cryptographic tally integrity check before results can be published',
        'Interactive bar and doughnut charts of vote distributions',
        'Winner detection and tie condition reporting',
        'Downloadable participation rosters and certified CSV/PDF reports'
      ]
    }
  ];

  return (
    <PublicLayout>
      {/* Header Banner */}
      <section className="py-16 lg:py-24 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-100/50 dark:bg-[#070b14]/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Platform Capabilities</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            DigiVote Platform Modules
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Every critical dimension of digital voting is implemented as an independent, robust module built with strict security boundaries.
          </p>
        </div>
      </section>

      {/* Modules List */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div 
                key={mod.id} 
                id={mod.id}
                className="scroll-mt-24 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 depth-card"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column: Icon + Overview */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                          {mod.badge}
                        </span>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                          {mod.title}
                        </h2>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {mod.description}
                    </p>

                    <div className="pt-2">
                      <Link
                        to="/register"
                        className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                      >
                        <span>Access in DigiVote Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Right Column: Key Capabilities */}
                  <div className="lg:col-span-7 bg-slate-50 dark:bg-[#111a33] rounded-xl p-5 border border-slate-200/80 dark:border-slate-800/80 space-y-3">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Key Architectural Capabilities
                    </h3>
                    <ul className="space-y-2.5">
                      {mod.capabilities.map((cap, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200">
                          <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                          <span>{cap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 bg-slate-50 dark:bg-[#070b14] border-t border-slate-200/80 dark:border-slate-800/80 text-center">
        <div className="max-w-2xl mx-auto px-4 space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Ready to experience these features?
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Sign up for an institutional voter or organizer account to explore all features.
          </p>
          <div className="pt-2">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/25"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

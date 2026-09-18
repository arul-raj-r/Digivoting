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
  Lock,
  Users,
  Upload,
  HelpCircle
} from 'lucide-react';

export default function Features() {
  const modules = [
    {
      id: 'auth',
      title: '1. Secure Authentication',
      icon: Key,
      badge: 'Identity Proofing',
      color: 'indigo',
      linkTo: '/login',
      linkLabel: 'Sign In or Register',
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
      title: '2. Election Creation',
      icon: Layers,
      badge: 'Election Ops',
      color: 'sky',
      linkTo: '/elections/create',
      linkLabel: 'Launch Creation Wizard',
      description: 'Comprehensive 6-stage election wizard allowing organizers to specify election slates, rosters, schedules, and verification protocols.',
      capabilities: [
        'Election metadata, type, and constituency categorization',
        'Configurable voting schedule with automatic duration calculation',
        'Comprehensive review and pre-launch verification check',
        'Pre-launch configuration locks preventing retroactive modifications',
        'Draft autosaving and state management'
      ]
    },
    {
      id: 'voter-management',
      title: '3. Voter Management (CSV Import)',
      icon: Upload,
      badge: 'Roster Integrity',
      color: 'emerald',
      linkTo: '/elections/create',
      linkLabel: 'Manage Voter Rolls',
      description: 'Institutional eligible voter roll management with automated CSV drag-and-drop ingestion, format verification, and duplicate detection.',
      capabilities: [
        'Server-side dry-run validation before committing records to database',
        'Automated duplicate detection and malformed row filtering',
        'Support for student_id, full_name, email, and mobile_number attributes',
        'Roster privacy: voters only see their own eligibility, not peer rosters',
        'Real-time valid vs. invalid row count reporting'
      ]
    },
    {
      id: 'verification',
      title: '4. Voter Verification',
      icon: UserCheck,
      badge: 'Biometric Ready',
      color: 'teal',
      linkTo: '/voter-verification',
      linkLabel: 'Open Verification Portal',
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
      id: 'candidate-management',
      title: '5. Candidate Management',
      icon: Users,
      badge: 'Nomination Slate',
      color: 'blue',
      linkTo: '/elections',
      linkLabel: 'View Candidate Slates',
      description: 'Fair, neutral candidate nomination workflow ensuring equal visibility, detailed platforms, and unbiased presentation.',
      capabilities: [
        'Candidate nomination with legal name, party or affiliation, and photo',
        'Comprehensive candidate manifesto and bio publishing',
        'Strictly neutral visual treatment during ballot presentation',
        'No algorithmic candidate recommendation or popularity ranking',
        'Pre-election slate validation and locking upon contest activation'
      ]
    },
    {
      id: 'voting',
      title: '6. Confidential Digital Voting',
      icon: Vote,
      badge: 'Secret Ballot',
      color: 'amber',
      linkTo: '/voting',
      linkLabel: 'Access Voting Booth',
      description: 'Streamlined, mobile-responsive ballot interface designed for absolute privacy, preventing multi-casting and coercion.',
      capabilities: [
        'Voting authorization token verification prior to ballot presentation',
        'Mobile-friendly candidate slate display with party affiliations',
        'Two-step vote review and confirmation modal',
        'Decoupled storage: voter credentials never link to cast ballots',
        'Minute-truncated submission timestamps to eliminate timing correlation'
      ]
    },
    {
      id: 'management',
      title: '7. Election Management & Control',
      icon: Sliders,
      badge: 'Operational Control',
      color: 'purple',
      linkTo: '/elections',
      linkLabel: 'Open Election Workspace',
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
      id: 'results',
      title: '8. Results & Certified Reports',
      icon: BarChart2,
      badge: 'Certified Tallies',
      color: 'rose',
      linkTo: '/results',
      linkLabel: 'Explore Results & Reports',
      description: 'Automated vote tabulation engine providing cryptographic integrity verification, visual result charts, and certified exportable reports.',
      capabilities: [
        'One-click automated tally computation directly from recorded ballots',
        'Tally integrity validation before results are certified and published',
        'Interactive bar charts and distribution summaries',
        'Winner detection and tie condition reporting',
        'Downloadable participation rosters and certified CSV reports'
      ]
    },
    {
      id: 'help',
      title: '9. AI Website Assistance (DigiVote Help)',
      icon: HelpCircle,
      badge: 'Website Guide',
      color: 'indigo',
      linkTo: '/help',
      linkLabel: 'Open Help & User Guide',
      description: 'Context-aware website guidance assistant answering questions about registration, verification, and voting backed by official documentation.',
      capabilities: [
        'Persistent floating widget accessible from any page via a side icon',
        'Context-aware suggested prompts tailored to the active route',
        'Human-readable source citations with document name and section',
        'Strict safety boundaries: refuses candidate advice or voting actions',
        'Helpful / Not Helpful feedback loop connected to backend metrics'
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
            <span>Platform Architecture</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            DigiVote System Features
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Nine integrated modules coordinating institutional authentication, roster verification, secret balloting, and certified reporting.
          </p>
        </div>
      </section>

      {/* Modules List */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div 
                key={mod.id} 
                id={mod.id}
                className="scroll-mt-24 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  
                  {/* Left Column */}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                          {mod.title}
                        </h2>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          {mod.badge}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                      {mod.description}
                    </p>
                    <div className="pt-1">
                      <Link
                        to={mod.linkTo}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                      >
                        <span>{mod.linkLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Right Column: Capabilities */}
                  <div className="lg:w-1/2 rounded-xl bg-slate-50 dark:bg-[#131d36] border border-slate-200/70 dark:border-slate-800/80 p-5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-3 block font-mono">
                      Key Technical Capabilities
                    </span>
                    <ul className="space-y-2">
                      {mod.capabilities.map((cap, cIdx) => (
                        <li key={cIdx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
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
            Built for Secure Institutional Governance
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Sign in or create an account to start creating or participating in digital elections.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/25"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/how-it-works"
              className="inline-flex items-center gap-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-6 py-3 rounded-xl text-xs font-semibold"
            >
              <span>See How It Works</span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

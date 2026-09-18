import React from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../layouts/PublicLayout';
import { 
  Shield, 
  Target, 
  Eye, 
  Cpu, 
  Lock, 
  CheckCircle2, 
  Code2, 
  Server, 
  ArrowRight,
  GraduationCap
} from 'lucide-react';

export default function About() {
  const techStack = [
    { category: 'Frontend', items: ['React.js 18', 'Vite', 'Tailwind CSS', 'Lucide Civic Icons'] },
    { category: 'Backend Core', items: ['Python 3.11', 'Django 5', 'Django REST Framework', 'JWT / SimpleJWT'] },
    { category: 'Database & Audit', items: ['PostgreSQL / SQLite', 'Decoupled Audit Logs', 'Isolated Ballot Schemas'] },
    { category: 'Biometrics & Security', items: ['OpenCV YuNet & SFace', 'Webcam Liveness Verification', 'Cryptographic Single-Use Tokens'] }
  ];

  const securityPrinciples = [
    {
      title: 'Decoupled Ballot Confidentiality',
      desc: 'Ballots are committed to an isolated database table with zero foreign key references to voter profiles. Timestamps are truncated to the minute to prevent statistical timing correlation.'
    },
    {
      title: 'Multi-Stage Identity Proofing',
      desc: 'Combines verified institutional email domain checking, time-bound 6-digit MFA OTP challenges, and optional real-time webcam face biometric verification.'
    },
    {
      title: 'Tamper-Evident Audit Logging',
      desc: 'Critical governance events (election state transitions, roster uploads, authorizations, result certifications) are committed to immutable audit logs.'
    },
    {
      title: 'State-Locked Lifecycle Control',
      desc: 'Once an election transitions to Active or Paused, configuration locks permanently prevent retroactive alterations to rules, candidate slates, or voter rolls.'
    }
  ];

  return (
    <PublicLayout>
      {/* Header Banner */}
      <section className="py-16 lg:py-24 border-b border-sage-200 dark:border-graphite-800 bg-ivory/50 dark:bg-graphite-950/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-50 dark:bg-forest-950/50 border border-forest-600/20 text-forest-700 dark:text-forest-400 text-xs font-semibold">
            <GraduationCap className="w-4 h-4" />
            <span>Academic & Institutional Platform</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-black text-graphite-900 dark:text-ivory tracking-tight">
            About DigiVote
          </h1>
          <p className="text-sm sm:text-base text-graphite-600 dark:text-sage-400 max-w-2xl mx-auto leading-relaxed">
            DigiVote is an institutional digital voting platform engineered to modernize organizational elections through verified digital identity, webcam face verification, and mathematically confidential ballot handling.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 border-b border-sage-200 dark:border-graphite-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <div className="p-8 rounded-2xl bg-white dark:bg-graphite-900 border border-sage-200 dark:border-graphite-800 shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-xl bg-forest-50 dark:bg-forest-950/60 border border-forest-600/20 text-forest-700 dark:text-forest-400 flex items-center justify-center">
                <Target className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-serif font-bold text-graphite-900 dark:text-ivory">Our Mission</h2>
              <p className="text-xs sm:text-sm text-graphite-600 dark:text-sage-400 leading-relaxed">
                To build an accessible, auditable, and secure digital election system that eliminates manual ballot bottlenecks, prevents fraudulent multi-casting, and preserves voter confidentiality without compromising auditability.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white dark:bg-graphite-900 border border-sage-200 dark:border-graphite-800 shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-xl bg-forest-50 dark:bg-forest-950/60 border border-forest-600/20 text-forest-700 dark:text-forest-400 flex items-center justify-center">
                <Eye className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-serif font-bold text-graphite-900 dark:text-ivory">Our Vision</h2>
              <p className="text-xs sm:text-sm text-graphite-600 dark:text-sage-400 leading-relaxed">
                To empower universities, student unions, professional bodies, and civic organizations with a reliable digital voting framework that provides verifiable democratic governance with high voter trust and participation.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Why DigiVote: Modernizing Traditional Voting */}
      <section className="py-16 bg-sage-50/50 dark:bg-graphite-950 border-b border-sage-200 dark:border-graphite-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-forest-700 dark:text-forest-400">
              WHY DIGIVOTE?
            </h2>
            <h3 className="text-2xl sm:text-3xl font-serif font-black text-graphite-900 dark:text-ivory tracking-tight">
              Modernizing the Institutional Voting Experience
            </h3>
            <p className="text-xs sm:text-sm text-graphite-600 dark:text-sage-400 leading-relaxed">
              Traditional paper-based processes or ad-hoc Google Forms suffer from impersonation, lack of secrecy guarantees, slow counting, and audit vulnerability. DigiVote addresses each challenge with targeted architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-graphite-900 border border-sage-200 dark:border-graphite-800 shadow-sm">
              <span className="text-forest-700 dark:text-forest-400 font-mono font-bold text-sm block mb-1">01. Identity</span>
              <h4 className="text-sm font-bold text-graphite-900 dark:text-ivory mb-2">Verified Rolls</h4>
              <p className="text-xs text-graphite-500 dark:text-sage-400 leading-relaxed">
                Replaces public links with pre-configured institutional rolls, email verification, and single-use challenge gates.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-graphite-900 border border-sage-200 dark:border-graphite-800 shadow-sm">
              <span className="text-forest-700 dark:text-forest-400 font-mono font-bold text-sm block mb-1">02. Biometrics</span>
              <h4 className="text-sm font-bold text-graphite-900 dark:text-ivory mb-2">Face Verification</h4>
              <p className="text-xs text-graphite-500 dark:text-sage-400 leading-relaxed">
                Uses computer vision (OpenCV SFace) to confirm that the person in front of the browser matches the authorized voter profile.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-graphite-900 border border-sage-200 dark:border-graphite-800 shadow-sm">
              <span className="text-forest-700 dark:text-forest-400 font-mono font-bold text-sm block mb-1">03. Privacy</span>
              <h4 className="text-sm font-bold text-graphite-900 dark:text-ivory mb-2">Confidential Ballots</h4>
              <p className="text-xs text-graphite-500 dark:text-sage-400 leading-relaxed">
                Separates voter participation records from ballot choices so no administrator can deduce how a specific citizen voted.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-graphite-900 border border-sage-200 dark:border-graphite-800 shadow-sm">
              <span className="text-forest-700 dark:text-forest-400 font-mono font-bold text-sm block mb-1">04. Speed</span>
              <h4 className="text-sm font-bold text-graphite-900 dark:text-ivory mb-2">Certified Results</h4>
              <p className="text-xs text-graphite-500 dark:text-sage-400 leading-relaxed">
                Tallies are calculated deterministically upon election conclusion, generating verified charts and audit export files.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-16 border-b border-sage-200 dark:border-graphite-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-forest-700 dark:text-forest-400 mb-2">
              ENGINEERING APPROACH
            </h2>
            <h3 className="text-2xl font-serif font-black text-graphite-900 dark:text-ivory tracking-tight">
              Technology Stack
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {techStack.map((col, idx) => (
              <div 
                key={idx}
                className="p-6 rounded-2xl bg-white dark:bg-graphite-900 border border-sage-200 dark:border-graphite-800 shadow-sm space-y-3"
              >
                <h4 className="text-xs font-bold uppercase tracking-wider text-graphite-400 dark:text-sage-400 font-mono">
                  {col.category}
                </h4>
                <ul className="space-y-2">
                  {col.items.map((item, i) => (
                    <li key={i} className="text-xs font-semibold text-graphite-800 dark:text-sage-200 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-forest-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Principles */}
      <section className="py-16 bg-sage-50/50 dark:bg-graphite-950 border-b border-sage-200 dark:border-graphite-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-forest-700 dark:text-forest-400 mb-2">
              FOUNDATIONAL GUARANTEES
            </h2>
            <h3 className="text-2xl font-serif font-black text-graphite-900 dark:text-ivory tracking-tight">
              Institutional Security Principles
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {securityPrinciples.map((principle, idx) => (
              <div 
                key={idx}
                className="p-6 rounded-2xl bg-white dark:bg-graphite-900 border border-sage-200 dark:border-graphite-800 flex items-start gap-4 shadow-sm"
              >
                <div className="w-9 h-9 rounded-xl bg-forest-50 dark:bg-forest-950/60 border border-forest-600/20 text-forest-700 dark:text-forest-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-graphite-900 dark:text-ivory mb-1">
                    {principle.title}
                  </h4>
                  <p className="text-xs text-graphite-600 dark:text-sage-400 leading-relaxed">
                    {principle.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 text-center">
        <div className="max-w-3xl mx-auto px-4 space-y-4">
          <h3 className="text-xl font-serif font-bold text-graphite-900 dark:text-ivory">
            Explore the platform capabilities
          </h3>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/how-it-works"
              className="inline-flex items-center gap-2 bg-forest-600 hover:bg-forest-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <span>How It Works</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/security"
              className="inline-flex items-center gap-2 border border-sage-300 dark:border-graphite-700 hover:bg-sage-100 dark:hover:bg-graphite-800 text-graphite-700 dark:text-sage-200 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all"
            >
              <span>Security Architecture</span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

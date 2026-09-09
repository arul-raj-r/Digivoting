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
    { category: 'Frontend', items: ['React.js', 'Vite', 'Tailwind CSS', 'Lucide Icons'] },
    { category: 'Backend', items: ['Python 3.11', 'Django', 'Django REST Framework', 'JWT / SimpleJWT'] },
    { category: 'Database & Storage', items: ['PostgreSQL / Supabase', 'SQLite Local Dev', 'Encrypted Tables'] },
    { category: 'Biometrics & AI', items: ['OpenCV', 'Face Recognition / ArcFace', 'Canvas Camera Capture'] }
  ];

  const securityPrinciples = [
    {
      title: 'Zero-Knowledge Ballot Secrecy',
      desc: 'Ballots are encrypted with symmetric keys and decoupled from voter identity records. Timestamps are minute-truncated to prevent correlation.'
    },
    {
      title: 'Multi-Stage Identity Proofing',
      desc: 'Combines verified email domain checking, 6-digit MFA OTPs, and real-time webcam facial embedding verification.'
    },
    {
      title: 'Tamper-Evident Audit Logging',
      desc: 'Critical governance events (election state changes, roster uploads, authorizations) are committed to immutable audit logs.'
    },
    {
      title: 'State-Locked Lifecycle Control',
      desc: 'Once an election transitions to Active or Paused, configuration locks permanently prevent retroactive alterations to rules or slates.'
    }
  ];

  return (
    <PublicLayout>
      {/* Header Banner */}
      <section className="py-16 lg:py-24 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-100/50 dark:bg-[#070b14]/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
            <GraduationCap className="w-4 h-4" />
            <span>Academic & Institutional Project</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            About DigiVote
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            DigiVote is an institutional digital voting platform developed to modernize traditional elections through verified digital identity, webcam face verification, and confidential ballot handling.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <div className="p-8 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Target className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Our Mission</h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                To build an accessible, auditable, and secure digital election system that eliminates manual ballot bottlenecks, prevents fraudulent multi-casting, and preserves voter confidentiality without compromising auditability.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="w-10 h-10 rounded-xl bg-sky-600/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Eye className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Our Vision</h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                To empower universities, student unions, cooperatives, and civic organizations with a reliable digital voting framework that provides verifiable democratic governance with high voter trust and participation.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Why DigiVote: Modernizing Traditional Voting */}
      <section className="py-16 bg-slate-50 dark:bg-[#070b14] border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              WHY DIGIVOTE?
            </h2>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Modernizing the Voting Experience
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Traditional paper-based or basic online forms suffer from identity impersonation, lack of confidentiality guarantees, slow counting, and audit vulnerability. DigiVote addresses each challenge with targeted architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800">
              <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold text-sm block mb-1">01. Identity</span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Verified Rolls</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Replaces unverified links with pre-configured institutional rolls, email verification, and OTP challenge gates.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800">
              <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold text-sm block mb-1">02. Biometrics</span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Face Verification</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Uses computer vision to confirm that the person in front of the browser matches the authorized voter profile.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800">
              <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold text-sm block mb-1">03. Privacy</span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Confidential Ballots</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Separates voter participation records from ballot choices so no administrator can deduce how a specific citizen voted.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800">
              <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold text-sm block mb-1">04. Speed</span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Certified Results</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Tallies are calculated instantaneously upon election conclusion, generating verified charts and reports.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-16 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
              ENGINEERING APPROACH
            </h2>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Technology Stack
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {techStack.map((col, idx) => (
              <div 
                key={idx}
                className="p-6 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  {col.category}
                </h4>
                <ul className="space-y-2">
                  {col.items.map((item, i) => (
                    <li key={i} className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
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
      <section className="py-16 bg-slate-50 dark:bg-[#070b14] border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
              FOUNDATIONAL GUARANTEES
            </h2>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Security Principles
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {securityPrinciples.map((principle, idx) => (
              <div 
                key={idx}
                className="p-6 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex items-start gap-4"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                    {principle.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
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
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Explore the platform capabilities
          </h3>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/features"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/25"
            >
              <span>View Features</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/security"
              className="inline-flex items-center gap-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-xl text-xs font-semibold"
            >
              <span>Security Architecture</span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

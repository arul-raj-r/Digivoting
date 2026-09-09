import React from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../layouts/PublicLayout';
import { 
  UserPlus, 
  MailCheck, 
  LogIn, 
  Key, 
  ShieldCheck, 
  FileCheck2, 
  UserCheck, 
  Camera, 
  Ticket, 
  Vote, 
  Send, 
  BarChart2, 
  ArrowDown, 
  ArrowRight,
  Shield
} from 'lucide-react';

export default function HowItWorks() {
  const steps = [
    {
      num: 1,
      title: 'Register Profile',
      category: 'Registration',
      icon: UserPlus,
      desc: 'Citizen signs up with full name, institutional email, phone number, and a secure password.',
      tag: 'Identity Entry'
    },
    {
      num: 2,
      title: 'Email Verification',
      category: 'Registration',
      icon: MailCheck,
      desc: 'Verification token is dispatched to ensure the institutional email address is authentic and owned by the citizen.',
      tag: 'Domain Validation'
    },
    {
      num: 3,
      title: 'Credential Login',
      category: 'Authentication',
      icon: LogIn,
      desc: 'Citizen inputs credentials or signs in through Google OAuth. Account lockout rules protect against brute-force attempts.',
      tag: 'Secure Handshake'
    },
    {
      num: 4,
      title: 'OTP Authentication',
      category: 'Authentication',
      icon: Key,
      desc: 'A time-limited 6-digit MFA OTP is generated, hashed with SHA-256, and validated with strict attempt counters.',
      tag: 'Multi-Factor'
    },
    {
      num: 5,
      title: 'Secure Session',
      category: 'Authentication',
      icon: ShieldCheck,
      desc: 'JWT access and refresh tokens are issued. Device session is registered for real-time auditability and revocation.',
      tag: 'Session Protection'
    },
    {
      num: 6,
      title: 'Election Eligibility',
      category: 'Verification',
      icon: FileCheck2,
      desc: 'System cross-references citizen identity against the pre-configured election voter roll and confirms voter has not voted.',
      tag: 'Roster Check'
    },
    {
      num: 7,
      title: 'Voter Verification Initiation',
      category: 'Verification',
      icon: UserCheck,
      desc: 'Citizen initiates verification challenge required by election rules (Email OTP challenge and facial biometrics).',
      tag: 'Challenge Active'
    },
    {
      num: 8,
      title: 'Webcam / Face Verification',
      category: 'Verification',
      icon: Camera,
      desc: 'Citizen captures a live camera frame. OpenCV / ArcFace compares face embeddings against the authorized profile.',
      tag: 'Biometric Match'
    },
    {
      num: 9,
      title: 'Voting Authorization',
      category: 'Verification',
      icon: Ticket,
      desc: 'Upon successful biometric and OTP challenges, a single-use cryptographically bound authorization token is issued.',
      tag: 'Token Issued'
    },
    {
      num: 10,
      title: 'Voting Booth Entry',
      category: 'Voting',
      icon: Vote,
      desc: 'Citizen enters the confidential polling booth. Candidate manifestos and choices are rendered in a private interface.',
      tag: 'Private Polling'
    },
    {
      num: 11,
      title: 'Vote Submission',
      category: 'Voting',
      icon: Send,
      desc: 'Ballot is encrypted with per-election key. Timestamp is truncated to the minute and voter link is deliberately detached.',
      tag: 'Secret Ballot'
    },
    {
      num: 12,
      title: 'Certified Results',
      category: 'Results',
      icon: BarChart2,
      desc: 'Once the election concludes, tallies are computed from encrypted ballots and published with cryptographic integrity proof.',
      tag: 'Published Tally'
    }
  ];

  return (
    <PublicLayout>
      {/* Header Banner */}
      <section className="py-16 lg:py-24 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-100/50 dark:bg-[#070b14]/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
            <Shield className="w-4 h-4" />
            <span>End-to-End Election Lifecycle</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            How DigiVote Works
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Follow the complete, step-by-step verification and voting journey from citizen registration to certified results publishing.
          </p>
        </div>
      </section>

      {/* Visual Timeline Workflow */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative border-l-2 border-indigo-200 dark:border-indigo-900/60 ml-4 sm:ml-8 space-y-10 pl-6 sm:pl-10">
            {steps.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="relative group">
                  {/* Timeline bullet / badge */}
                  <div className="absolute -left-[35px] sm:-left-[51px] top-1.5 w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-[#0d1527] border-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono font-bold text-xs shadow-md shadow-indigo-600/10 group-hover:scale-110 transition-transform">
                    {item.num}
                  </div>

                  {/* Step Card */}
                  <div className="p-6 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 depth-card transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {item.title}
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 w-fit">
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 bg-slate-50 dark:bg-[#070b14] border-t border-slate-200/80 dark:border-slate-800/80 text-center">
        <div className="max-w-2xl mx-auto px-4 space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Experience the workflow in action
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Create an account or view security principles to understand the underlying cryptographic architecture.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/25"
            >
              <span>Create an Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/security"
              className="inline-flex items-center gap-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-6 py-3 rounded-xl text-xs font-semibold"
            >
              <span>Security Details</span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

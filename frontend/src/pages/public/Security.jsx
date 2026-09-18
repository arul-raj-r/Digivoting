import React from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../layouts/PublicLayout';
import { 
  ShieldCheck, 
  Key, 
  Mail, 
  Laptop, 
  UserCheck, 
  Camera, 
  Ticket, 
  Lock, 
  Terminal, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight
} from 'lucide-react';

export default function Security() {
  const securityFeatures = [
    {
      title: 'Secure Authentication & Password Hashing',
      icon: Key,
      badge: 'Account Security',
      details: 'Passphrases are salted and hashed using PBKDF2 cryptographic algorithms. Account lockout mechanisms automatically trigger after consecutive failed attempts to thwart credential stuffing.'
    },
    {
      title: 'Email Domain & Ownership Verification',
      icon: Mail,
      badge: 'Identity Proofing',
      details: 'Tokens generated for email confirmation are single-use, time-bound, and stored as cryptographic hashes. Resend intervals enforce server-side cooldown windows to prevent email fatigue.'
    },
    {
      title: 'Multi-Factor OTP Authentication',
      icon: ShieldCheck,
      badge: 'MFA Protection',
      details: '6-digit authentication challenges are generated dynamically, hashed with SHA-256 before storage, and expire in 5 minutes. The backend enforces attempt limits before invalidating the challenge.'
    },
    {
      title: 'Session Management & Device Revocation',
      icon: Laptop,
      badge: 'Session Security',
      details: 'Active sessions maintain distinct refresh token identifiers (JTI) tracked in database records. Users can audit all active sessions with IP addresses and user agents, and revoke sessions remotely.'
    },
    {
      title: 'Role & Ownership Access Control',
      icon: UserCheck,
      badge: 'Platform Security',
      details: 'Authorization is governed strictly by the Django backend using custom permissions. Frontend views merely reflect granted capabilities; no client-side claims or tokens can override backend restrictions.'
    },
    {
      title: 'Voter Eligibility Roster Validation',
      icon: CheckCircle2,
      badge: 'Election Security',
      details: 'Voters must be pre-enrolled on the election roster. The system verifies that the authenticated user matches an authorized voter record and strictly checks that no ballot has been cast previously in the target election.'
    },
    {
      title: 'Webcam Face Verification',
      icon: Camera,
      badge: 'Biometric Pipeline',
      details: 'When webcam verification is enabled for an election, real-time camera captures are compared against authorized photo embeddings using OpenCV and SFace models, confirming physical voter presence.'
    },
    {
      title: 'One-Time Single-Use Voting Authorization',
      icon: Ticket,
      badge: 'Ballot Gate',
      details: 'Following successful OTP challenge and facial verification, a short-lived, single-use voting authorization token is minted. It must be consumed at the exact moment the ballot is cast, preventing multi-casting.'
    },
    {
      title: 'Confidential Ballot Decoupling',
      icon: Lock,
      badge: 'Ballot Secrecy',
      details: 'Ballots are stored in an isolated table with zero foreign keys to voter accounts. Timestamps are truncated to the minute to prevent statistical correlation attacks while preserving tally integrity.'
    },
    {
      title: 'Centralized Audit & Security Event Logging',
      icon: Terminal,
      badge: 'Governance Audit',
      details: 'All security events (logins, lockouts, verification challenges, election state changes, result calculations) are written to persistent audit logs with severity levels, client IP addresses, and timestamps.'
    }
  ];

  return (
    <PublicLayout>
      {/* Header Banner */}
      <section className="py-16 lg:py-24 border-b border-sage-200 dark:border-graphite-800 bg-ivory/50 dark:bg-graphite-950/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-50 dark:bg-forest-950/50 border border-forest-600/20 text-forest-700 dark:text-forest-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Verified Architectural Security</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-black text-graphite-900 dark:text-ivory tracking-tight">
            Security Architecture
          </h1>
          <p className="text-sm sm:text-base text-graphite-600 dark:text-sage-400 max-w-2xl mx-auto leading-relaxed">
            DigiVote is built upon verified security mechanisms designed to protect election integrity, voter confidentiality, and institutional auditability.
          </p>
        </div>
      </section>

      {/* Security Architecture Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {securityFeatures.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div 
                  key={idx}
                  className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-graphite-900 border border-sage-200 dark:border-graphite-800 shadow-sm flex flex-col justify-between hover:border-forest-600/30 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-forest-50 dark:bg-forest-950/60 border border-forest-600/20 text-forest-700 dark:text-forest-400 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sage-100 dark:bg-graphite-800 text-graphite-700 dark:text-sage-300">
                        {feat.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-graphite-900 dark:text-ivory">
                      {feat.title}
                    </h3>

                    <p className="text-xs text-graphite-600 dark:text-sage-400 leading-relaxed">
                      {feat.details}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Security Policy Statement */}
      <section className="py-16 bg-sage-50/50 dark:bg-graphite-950 border-t border-sage-200 dark:border-graphite-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <h2 className="text-xl font-serif font-bold text-graphite-900 dark:text-ivory">
            Transparency & Verification Policy
          </h2>
          <p className="text-xs sm:text-sm text-graphite-600 dark:text-sage-400 max-w-2xl mx-auto leading-relaxed">
            DigiVote does not make unverified cryptographic claims or advertise artificial certifications. Every security guarantee described on this platform corresponds directly to tested backend code and verified database operations.
          </p>
          <div className="pt-2">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 text-xs font-bold text-forest-700 dark:text-forest-400 hover:underline"
            >
              <span>Have security questions? Contact our team</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../layouts/PublicLayout';
import { 
  UserPlus, 
  LogIn, 
  Vote, 
  Search, 
  FileCheck2, 
  UserCheck, 
  Ticket, 
  Send, 
  CheckCircle2, 
  BarChart2, 
  ArrowRight,
  Shield,
  PlusCircle,
  Users,
  Upload,
  ShieldCheck,
  Calendar,
  Sliders,
  Award
} from 'lucide-react';

export default function HowItWorks() {
  const [activeTab, setActiveTab] = useState('voter'); // 'voter' | 'creator'

  const voterSteps = [
    {
      num: 1,
      title: 'Sign In to DigiVote',
      icon: LogIn,
      tag: 'Authentication',
      desc: 'Authenticate securely using your registered institutional credentials or Google OAuth with multi-factor OTP protection.'
    },
    {
      num: 2,
      title: 'Browse Available Elections',
      icon: Vote,
      tag: 'Discovery',
      desc: 'View contests published by your organization. The system checks server-side voter rolls to indicate your eligibility status.'
    },
    {
      num: 3,
      title: 'Select Contest',
      icon: Search,
      tag: 'Contest Selection',
      desc: 'Review the contest schedule, instructions, positions, and nominated candidate manifestos.'
    },
    {
      num: 4,
      title: 'Roster Eligibility Check',
      icon: FileCheck2,
      tag: 'Eligibility Gate',
      desc: 'The platform confirms your enrollment on the creator-uploaded voter roster and ensures no ballot was previously cast.'
    },
    {
      num: 5,
      title: 'Identity Verification',
      icon: UserCheck,
      tag: 'Verification',
      desc: 'Complete required verification challenges configured for the contest: email OTP challenge and real-time webcam face matching.'
    },
    {
      num: 6,
      title: 'One-Time Voting Authorization',
      icon: Ticket,
      tag: 'Authorization Token',
      desc: 'Upon verification success, the server issues a cryptographically signed, single-use 15-minute authorization token.'
    },
    {
      num: 7,
      title: 'Enter Polling Booth',
      icon: Vote,
      tag: 'Private Polling',
      desc: 'Access a distraction-free, confidential voting booth with equal, neutral visual presentation for all nominated candidates.'
    },
    {
      num: 8,
      title: 'Review Ballot Selection',
      icon: ShieldCheck,
      tag: 'Confirmation',
      desc: 'Verify your chosen candidate on an explicit confirmation screen emphasizing the finality and confidentiality of your ballot.'
    },
    {
      num: 9,
      title: 'Cast & Decouple Ballot',
      icon: Send,
      tag: 'Secret Ballot',
      desc: 'Your ballot choice is committed to an isolated tally table with minute-truncated timestamps, completely decoupled from your voter identity.'
    },
    {
      num: 10,
      title: 'Receive Official Vote Confirmation',
      icon: CheckCircle2,
      tag: 'Participation Receipt',
      desc: 'Receive an official backend confirmation with receipt ID and timestamp. You can print or copy your participation reference.'
    }
  ];

  const creatorSteps = [
    {
      num: 1,
      title: 'Sign In with Unified Account',
      icon: LogIn,
      tag: 'Authentication',
      desc: 'Log in with your institutional DigiVote account. There is no separate login; permissions and ownership are validated server-side.'
    },
    {
      num: 2,
      title: 'Open My Elections Hub',
      icon: Sliders,
      tag: 'Management Hub',
      desc: 'Access your organizer dashboard showing draft, scheduled, live, paused, and completed elections you manage.'
    },
    {
      num: 3,
      title: 'Launch Election Wizard',
      icon: PlusCircle,
      tag: 'Creation',
      desc: 'Initiate a structured 6-step election creation workflow with automatic step validation and draft saving.'
    },
    {
      num: 4,
      title: 'Configure Contest Details',
      icon: FileCheck2,
      tag: 'Details',
      desc: 'Set election title, detailed description, host organization, election type, and position category.'
    },
    {
      num: 5,
      title: 'Nominate Candidates',
      icon: Users,
      tag: 'Candidate Slate',
      desc: 'Add candidates with legal names, party or committee affiliations, photographs, and complete manifesto statements.'
    },
    {
      num: 6,
      title: 'Upload Eligible Voters (CSV)',
      icon: Upload,
      tag: 'Roster Upload',
      desc: 'Upload a CSV roster with format: student_id, full_name, email, mobile. The system runs backend dry-run validation.'
    },
    {
      num: 7,
      title: 'Configure Verification Rules',
      icon: ShieldCheck,
      tag: 'Security Rules',
      desc: 'Select mandatory security checks for voters: Email OTP challenges and webcam facial embedding verification.'
    },
    {
      num: 8,
      title: 'Set Contest Schedule',
      icon: Calendar,
      tag: 'Scheduling',
      desc: 'Define exact voting commencement and conclusion timestamps with automated duration calculation.'
    },
    {
      num: 9,
      title: 'Review & Publish',
      icon: CheckCircle2,
      tag: 'Publication',
      desc: 'Audit the contest summary. Once published, configuration locks prevent retroactive tampering with rules or slates.'
    },
    {
      num: 10,
      title: 'Manage Election Lifecycle & QR',
      icon: Award,
      tag: 'Control Center',
      desc: 'Download instant QR codes for voter access, monitor live turnout, manage pause/resume, and publish certified results.'
    }
  ];

  const currentSteps = activeTab === 'voter' ? voterSteps : creatorSteps;

  return (
    <PublicLayout>
      {/* Header Banner */}
      <section className="py-16 lg:py-24 border-b border-sage-200 dark:border-graphite-800 bg-ivory/50 dark:bg-graphite-950/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-50 dark:bg-forest-950/50 border border-forest-600/20 text-forest-700 dark:text-forest-400 text-xs font-semibold">
            <Shield className="w-4 h-4" />
            <span>Civic Voting Architecture</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif font-black text-graphite-900 dark:text-ivory tracking-tight">
            How DigiVote Works
          </h1>
          <p className="text-sm sm:text-base text-graphite-600 dark:text-sage-400 max-w-2xl mx-auto leading-relaxed">
            A clear, transparent guide to digital balloting — whether you are an eligible voter casting a confidential ballot or an organizer managing an institutional election.
          </p>

          {/* Interactive Role Flow Switcher */}
          <div className="pt-6 flex justify-center">
            <div className="inline-flex p-1 rounded-2xl bg-sage-200/80 dark:bg-graphite-900 border border-sage-300 dark:border-graphite-700">
              <button
                type="button"
                onClick={() => setActiveTab('voter')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'voter'
                    ? 'bg-forest-600 text-white shadow-sm'
                    : 'text-graphite-600 dark:text-sage-300 hover:text-graphite-900 dark:hover:text-white'
                }`}
              >
                <Vote className="w-3.5 h-3.5" />
                <span>Voter Experience Flow</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('creator')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'creator'
                    ? 'bg-forest-600 text-white shadow-sm'
                    : 'text-graphite-600 dark:text-sage-300 hover:text-graphite-900 dark:hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Election Creator Flow</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Timeline Workflow */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center pb-12 space-y-1">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-forest-700 dark:text-forest-400">
              {activeTab === 'voter' ? 'Voter Participation Journey' : 'Election Organizer Lifecycle'}
            </span>
            <h2 className="text-2xl font-serif font-bold text-graphite-900 dark:text-ivory">
              {activeTab === 'voter' ? 'From Eligibility to Official Receipt' : 'From Creation to Certified Results'}
            </h2>
          </div>

          <div className="relative border-l-2 border-forest-600/30 dark:border-forest-800/40 ml-4 sm:ml-8 space-y-10 pl-6 sm:pl-10">
            {currentSteps.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="relative group">
                  {/* Timeline bullet / badge */}
                  <div className="absolute -left-[35px] sm:-left-[51px] top-1.5 w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white dark:bg-graphite-900 border-2 border-forest-600 text-forest-700 dark:text-forest-400 flex items-center justify-center font-mono font-bold text-xs shadow-sm group-hover:scale-105 transition-transform">
                    {item.num}
                  </div>

                  {/* Step Card */}
                  <div className="p-6 rounded-2xl bg-white dark:bg-graphite-900 border border-sage-200 dark:border-graphite-800 shadow-sm hover:border-forest-600/30 dark:hover:border-forest-600/30 transition-all space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-forest-700 dark:text-forest-400" />
                        <h3 className="text-base font-bold text-graphite-900 dark:text-ivory">
                          {item.title}
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-forest-50 dark:bg-forest-950/50 text-forest-700 dark:text-forest-300 border border-forest-600/20 w-fit">
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-xs text-graphite-600 dark:text-sage-400 leading-relaxed">
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
      <section className="py-16 bg-sage-50/50 dark:bg-graphite-950 border-t border-sage-200 dark:border-graphite-800 text-center">
        <div className="max-w-2xl mx-auto px-4 space-y-4">
          <h2 className="text-2xl font-serif font-bold text-graphite-900 dark:text-ivory">
            Ready to participate or launch an election?
          </h2>
          <p className="text-xs sm:text-sm text-graphite-600 dark:text-sage-400">
            Create an account or sign in to experience the institutional voting workflow.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-forest-600 hover:bg-forest-700 text-white px-6 py-3 rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/security"
              className="inline-flex items-center gap-2 border border-sage-300 dark:border-graphite-700 hover:bg-sage-100 dark:hover:bg-graphite-800 text-graphite-700 dark:text-sage-200 px-6 py-3 rounded-xl text-xs font-semibold transition-all"
            >
              <span>Security Architecture</span>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

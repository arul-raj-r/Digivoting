import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  User, 
  Mail, 
  Calendar, 
  ShieldCheck, 
  CheckCircle2, 
  Lock,
  FileCheck
} from 'lucide-react';

export default function VoterProfile() {
  const { user } = useAuth();

  const memberName = user?.first_name 
    ? `${user.first_name} ${user.last_name || ''}`.trim() 
    : (user?.full_name || user?.name || user?.email?.split('@')[0] || 'Organization Member');

  const profileData = {
    name: memberName,
    email: user?.email || 'member@digivote.app',
    role: user?.role === 'ELECTION_CREATOR' ? 'Election Organizer' : user?.role === 'ADMIN' ? 'Administrator' : 'Organization Member',
    dateJoined: user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'Active Member',
    mfaStatus: user?.is_verified ? 'Verified & Secure' : 'Email Active',
    rosterStatus: 'Eligible Member'
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 dark:bg-sky-600 text-white flex items-center justify-center text-2xl font-bold shadow-md shrink-0">
            {profileData.name.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                {profileData.name}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified Account
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {profileData.role} • DigiVote Organization Network
            </p>
          </div>
        </div>
      </div>

      {/* Profile Field Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal & Registry Details */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400 dark:text-slate-400">
            Member Details
          </h2>

          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block text-[11px]">Display Name</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  {profileData.name}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block text-[11px]">Member Email</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  {profileData.email}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block text-[11px]">Enrollment / Registration Date</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  {profileData.dateJoined}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Participation Protocol */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-400 dark:text-slate-400">
            Security & Voting Status
          </h2>

          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block text-[11px]">Authentication Status</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  {profileData.mfaStatus}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Authenticated session backed by secure tokens.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileCheck className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block text-[11px]">Organization Roster Status</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  {profileData.rosterStatus}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Authorized for eligible contests and polls within your organization.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block text-[11px]">Ballot Secrecy Guarantee</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  Cryptographically Anonymized
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Member credentials are never stored with or linked to cast ballots.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Information Notice */}
      <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
        <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">
          Member Profile Information
        </p>
        <p className="leading-relaxed">
          Your profile is securely maintained within the DigiVote platform. If you require email or organizational affiliation updates, please contact your organizational administrator.
        </p>
      </div>

    </div>
  );
}

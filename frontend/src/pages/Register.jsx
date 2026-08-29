import { Link } from 'react-router-dom';
import { Shield, Lock, ShieldCheck, Award, FileText, CheckCircle2, Phone, Mail, HelpCircle } from 'lucide-react';
import RegisterForm from '../components/auth/RegisterForm';

export default function Register() {
  return (
    <div className="min-h-screen bg-[#f0f4f9] text-slate-800 flex flex-col font-sans">
      
      {/* 1. TOP NATIONAL STRIP */}
      <div className="w-full h-1.5 bg-gradient-to-r from-[#f47c20] via-white to-[#11783e]" />
      
      {/* 2. ECI OFFICIAL HEADER BAR */}
      <header className="w-full bg-[#0d2847] text-white shadow-md border-b border-[#183e68]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Emblem & Title */}
          <div className="flex items-center gap-3.5">
            {/* National Emblem Replica Seal */}
            <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shadow-inner">
              <svg className="w-7 h-7 fill-current text-amber-300" viewBox="0 0 24 24">
                <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4zm0 3.18l6 3v4.82c0 4.38-2.92 8.48-6 9.6-3.08-1.12-6-5.22-6-9.6V8.18l6-3zM11 7h2v6h-2zm0 8h2v2h-2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-bold tracking-tight font-serif text-white">
                  भारत निर्वाचन आयोग
                </span>
                <span className="hidden md:inline-block text-[11px] font-bold px-2 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded">
                  ECI VOTER SERVICES
                </span>
              </div>
              <p className="text-xs text-slate-200 font-medium tracking-wide">
                Election Commission of India — DigiVote Sovereign Portal
              </p>
            </div>
          </div>

          {/* Quick links & Helpline */}
          <div className="flex items-center gap-4 text-xs">
            <div className="hidden lg:flex items-center gap-2 text-slate-200 border-r border-blue-800 pr-4">
              <Phone className="w-3.5 h-3.5 text-amber-300" />
              <span>Toll Free Voter Helpline: <strong>1950</strong></span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-slate-300 hidden sm:inline">Already registered?</span>
              <Link
                to="/login"
                className="px-4 py-1.5 rounded bg-[#f47c20] hover:bg-[#e06910] text-white font-bold text-xs uppercase tracking-wide transition-colors shadow-sm"
              >
                Citizen Sign In
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* 3. BREADCRUMB / NOTICE BAR */}
      <div className="w-full bg-[#183e68] text-white text-xs py-1.5 px-4 sm:px-8 border-b border-[#0d2847]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-amber-300">Portals:</span>
            <span>National Voter's Service &bull; Online Registration &bull; Form 6 Digital Portal</span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-slate-300">
            <span>Official Democracy Network (Module 1)</span>
          </div>
        </div>
      </div>

      {/* 4. MAIN CONTENT SECTION */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: ECI Trust & Instructions (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Main Welcome Card */}
            <div className="bg-white rounded-lg border border-[#d4e0eb] p-6 shadow-sm">
              <div className="flex items-center gap-2 text-[#0d2847] font-bold text-sm uppercase tracking-wide border-b border-slate-100 pb-3 mb-4">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Secure Digital Voter Registration</span>
              </div>

              <h1 className="text-2xl font-bold font-serif text-[#0d2847] leading-tight mb-3">
                Your Vote, Secured & Auditable
              </h1>

              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Register an official digital voter account on the DigiVote sovereign voting platform. Once registered, you will be able to complete EPIC voter identity verification and cast tamper-evident digital ballots during elections.
              </p>

              <div className="bg-[#f8fafc] border-l-4 border-[#0d2847] p-3 rounded-r text-xs text-slate-700 space-y-1">
                <p className="font-bold text-[#0d2847]">Eligibility Criteria:</p>
                <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-0.5">
                  <li>Must be an Indian Citizen aged 18 or above</li>
                  <li>Possess an active Email & Mobile Number for OTP verification</li>
                  <li>Have valid identity documents ready for verification (Module 4)</li>
                </ul>
              </div>
            </div>

            {/* Statutory Security Standards */}
            <div className="bg-[#0d2847] text-white rounded-lg p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-300 border-b border-blue-900 pb-2">
                Election Commission Security Guarantees
              </h2>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded bg-white/10 text-emerald-400 shrink-0 mt-0.5">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">End-to-End Cryptographic Encryption</h3>
                    <p className="text-[11px] text-slate-300">Voter choices are anonymized using zero-knowledge cryptographic safeguards.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded bg-white/10 text-amber-400 shrink-0 mt-0.5">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Multi-Factor Authentication (MFA)</h3>
                    <p className="text-[11px] text-slate-300">Enforces two-step OTP verification to prevent unauthorized voter impersonation.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded bg-white/10 text-blue-400 shrink-0 mt-0.5">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Audit Logs & Verifiable Receipts</h3>
                    <p className="text-[11px] text-slate-300">Generates tamper-evident cryptographic receipts for independent post-election auditing.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Helpline Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-900 flex items-center justify-between">
              <div>
                <p className="font-bold">Need assistance with registration?</p>
                <p className="text-[11px] text-amber-800">Contact Election Commission Helpdesk</p>
              </div>
              <span className="font-extrabold text-base bg-amber-200/80 px-2.5 py-1 rounded text-amber-950">
                1950
              </span>
            </div>
          </div>

          {/* RIGHT COLUMN: Official Registration Form (7 Cols) */}
          <div className="lg:col-span-7">
            
            <div className="bg-white rounded-lg border border-[#d4e0eb] shadow-sm overflow-hidden">
              
              {/* Form Title Banner */}
              <div className="bg-[#f8fafc] border-b border-[#d4e0eb] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded uppercase">
                      New Citizen Account
                    </span>
                    <h2 className="text-xl font-bold font-serif text-[#0d2847] mt-1">
                      Citizen Online Registration Form
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Please enter accurate personal information to begin identity verification.
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-slate-300 hidden sm:block" />
                </div>
              </div>

              {/* Form Body */}
              <div className="p-6 sm:p-8">
                <RegisterForm />
              </div>

              {/* Form Footer */}
              <div className="bg-[#f8fafc] border-t border-[#d4e0eb] p-4 text-center text-xs text-slate-600">
                <span>Already registered with DigiVote? </span>
                <Link to="/login" className="font-bold text-[#0d2847] hover:underline">
                  Sign In to Voter Dashboard
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* 5. OFFICIAL GOVERNMENT FOOTER */}
      <footer className="w-full bg-[#0d2847] text-white border-t-4 border-[#f47c20] mt-12 py-8 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-bold uppercase tracking-wider text-amber-300 mb-2">Election Commission of India</h4>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Nirvachan Sadan, Ashoka Road, New Delhi 110001. DigiVote is a state-of-the-art secure electronic democracy framework.
            </p>
          </div>

          <div>
            <h4 className="font-bold uppercase tracking-wider text-amber-300 mb-2">Quick Citizen Links</h4>
            <ul className="space-y-1 text-[11px] text-slate-300">
              <li>&bull; Search Name in Electoral Roll (EPIC)</li>
              <li>&bull; Voter Education & Awareness (SVEEP)</li>
              <li>&bull; National Grievance Redressal Portal</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold uppercase tracking-wider text-amber-300 mb-2">Statutory Security Notice</h4>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              All unauthorized access attempts are monitored and subject to prosecution under the Information Technology Act and Representation of the People Act.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 pt-4 border-t border-blue-900 text-center text-[11px] text-slate-400">
          &copy; {new Date().getFullYear()} Election Commission of India. DigiVote Platform — All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}

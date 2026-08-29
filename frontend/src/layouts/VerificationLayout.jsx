import { ShieldAlert, CheckCircle, ChevronLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function VerificationLayout({ children, currentStep = 1, steps = [] }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gov-dark flex flex-col text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Verification Header */}
      <header className="h-16 bg-white dark:bg-gov-cardDark border-b border-slate-205 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 md:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="h-5 w-px bg-slate-200 dark:bg-slate-700"></span>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-gov-blue dark:text-gov-slate" />
            <span className="font-semibold text-sm sm:text-base">Citizen Verification Hub</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-550 dark:text-slate-400">
          <span>Protected Session</span>
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col lg:flex-row gap-6">
        {/* Left Side Stepper */}
        {steps.length > 0 && (
          <aside className="w-full lg:w-80 bg-white dark:bg-gov-cardDark p-6 rounded-xl border border-slate-200 dark:border-slate-850 self-start">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-6">
              Verification Progress
            </h3>
            
            <div className="relative space-y-8 pl-4 border-l border-slate-200 dark:border-slate-800">
              {steps.map((step, index) => {
                const stepNum = index + 1;
                const isActive = currentStep === stepNum;
                const isCompleted = currentStep > stepNum;
                
                return (
                  <div key={step.title} className="relative flex items-start gap-4">
                    {/* Step circle indicator */}
                    <div
                      className={`absolute -left-[25px] flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold border transition-colors ${
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : isActive
                          ? 'bg-gov-blue border-gov-blue text-white dark:bg-gov-gold dark:border-gov-gold dark:text-slate-900'
                          : 'bg-white border-slate-300 text-slate-450 dark:bg-gov-cardDark dark:border-slate-700'
                      }`}
                    >
                      {isCompleted ? <CheckCircle className="h-3 w-3" /> : stepNum}
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <span
                        className={`text-xs font-semibold ${
                          isActive
                            ? 'text-gov-blue dark:text-gov-slate'
                            : isCompleted
                            ? 'text-slate-500 dark:text-slate-450'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {step.title}
                      </span>
                      <span className="text-[11px] text-slate-450 dark:text-slate-450">
                        {step.description}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6 text-[11px] text-slate-450 leading-relaxed space-y-2">
              <p className="font-semibold text-slate-700 dark:text-slate-350">Privacy Consent Notice</p>
              <p>Your data is processed in accordance with digital security standards. No Aadhaar credentials, face logs, or biometric readings are recorded locally or shared with third parties.</p>
            </div>
          </aside>
        )}

        {/* Right Side Content Form */}
        <div className="flex-grow bg-white dark:bg-gov-cardDark p-6 sm:p-8 rounded-xl border border-slate-205 dark:border-slate-850 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

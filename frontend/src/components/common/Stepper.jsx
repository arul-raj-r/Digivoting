import { Check } from 'lucide-react';

export default function Stepper({
  steps = [],
  currentStep = 1,
  className = '',
}) {
  return (
    <div className={`w-full flex items-center justify-between gap-2 ${className}`}>
      {steps.map((step, index) => {
        const stepNum = index + 1;
        const isActive = currentStep === stepNum;
        const isCompleted = currentStep > stepNum;

        return (
          <div key={step} className="flex-grow flex items-center gap-2">
            {/* Circle */}
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border transition-colors shrink-0 ${
                isCompleted
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : isActive
                  ? 'bg-gov-blue border-gov-blue text-white dark:bg-gov-gold dark:border-gov-gold dark:text-slate-900'
                  : 'bg-white border-slate-300 text-slate-450 dark:bg-gov-cardDark dark:border-slate-700'
              }`}
            >
              {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
            </div>

            {/* Label (only shown on larger screens for sub-steps, or styled nicely) */}
            <span
              className={`hidden sm:inline text-xs font-semibold truncate ${
                isActive
                  ? 'text-gov-blue dark:text-gov-slate'
                  : isCompleted
                  ? 'text-slate-500'
                  : 'text-slate-400'
              }`}
            >
              {step}
            </span>

            {/* Connecting Line (omit for last step) */}
            {index < steps.length - 1 && (
              <div
                className={`flex-grow h-0.5 rounded transition-colors mx-2 ${
                  isCompleted ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

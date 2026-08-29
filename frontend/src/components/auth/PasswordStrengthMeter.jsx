import { Check, X } from 'lucide-react';

export default function PasswordStrengthMeter({ password = '' }) {
  const criteria = [
    { label: '8+ Characters', valid: password.length >= 8 },
    { label: 'Uppercase (A-Z)', valid: /[A-Z]/.test(password) },
    { label: 'Number (0-9)', valid: /[0-9]/.test(password) },
    { label: 'Special Character', valid: /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/`~]/.test(password) },
  ];

  const metCount = criteria.filter((c) => c.valid).length;

  let strengthLabel = 'Weak';
  let strengthColor = 'bg-red-500';
  let badgeColor = 'text-red-700 bg-red-50 border-red-200';
  let widthPercent = '25%';

  if (metCount === 4) {
    strengthLabel = 'Strong (Commission Grade)';
    strengthColor = 'bg-emerald-600';
    badgeColor = 'text-emerald-800 bg-emerald-50 border-emerald-300';
    widthPercent = '100%';
  } else if (metCount >= 2) {
    strengthLabel = 'Moderate';
    strengthColor = 'bg-amber-500';
    badgeColor = 'text-amber-800 bg-amber-50 border-amber-300';
    widthPercent = '60%';
  }

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded text-xs">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-700">Security Strength:</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
          {strengthLabel}
        </span>
      </div>

      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${strengthColor} transition-all duration-300`} style={{ width: widthPercent }} />
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1">
        {criteria.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5 text-[11px]">
            {item.valid ? (
              <Check className="w-3 h-3 text-emerald-700 shrink-0 stroke-[2.5]" />
            ) : (
              <X className="w-3 h-3 text-slate-400 shrink-0" />
            )}
            <span className={item.valid ? 'text-slate-900 font-medium' : 'text-slate-500'}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

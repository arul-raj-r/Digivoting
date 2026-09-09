import { useState, useEffect } from 'react';
import { Lock, Clock, AlertTriangle } from 'lucide-react';

export default function LockoutBanner({
  lockedUntil,
  onUnlock,
  className = '',
}) {
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    if (!lockedUntil) return;

    const calculateRemaining = () => {
      const diffMs = new Date(lockedUntil).getTime() - Date.now();
      return Math.max(0, Math.ceil(diffMs / 1000));
    };

    setSecondsRemaining(calculateRemaining());

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        if (onUnlock) onUnlock();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockedUntil, onUnlock]);

  if (!lockedUntil || secondsRemaining <= 0) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-900 dark:text-rose-200 shadow-xs ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-rose-100 dark:bg-rose-900/60 rounded-lg shrink-0 mt-0.5">
          <Lock className="h-5 w-5 text-rose-600 dark:text-rose-400" />
        </div>
        <div className="space-y-1.5 flex-grow">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-rose-900 dark:text-rose-200">
              Account Temporarily Locked
            </h4>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-rose-200/60 dark:bg-rose-900/80 rounded-full text-xs font-mono font-bold text-rose-800 dark:text-rose-200">
              <Clock className="h-3.5 w-3.5" />
              <span>{timeFormatted}</span>
            </div>
          </div>
          <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
            For your security, this account has been temporarily locked following consecutive failed authentication attempts.
            Please wait for the security cooldown timer to expire before attempting to sign in again.
          </p>
        </div>
      </div>
    </div>
  );
}

import { CheckCircle, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export default function Alert({
  children,
  type = 'info',
  title,
  onClose,
  className = '',
}) {
  const styles = {
    success: 'bg-emerald-50 border-emerald-250 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-300',
    error: 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300',
    warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-300',
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-300',
  };

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-emerald-650 dark:text-emerald-450 shrink-0" />,
    error: <AlertCircle className="h-5 w-5 text-rose-650 dark:text-rose-450 shrink-0" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-650 dark:text-amber-450 shrink-0" />,
    info: <Info className="h-5 w-5 text-blue-650 dark:text-blue-450 shrink-0" />,
  };

  return (
    <div 
      className={`flex items-start gap-3 p-4 rounded-lg border text-sm ${styles[type]} ${className}`}
      role="alert"
    >
      {icons[type]}
      <div className="flex-grow space-y-1">
        {title && <h5 className="font-bold">{title}</h5>}
        <div className="leading-relaxed">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-current shrink-0"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

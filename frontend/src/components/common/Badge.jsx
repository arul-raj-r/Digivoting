export default function Badge({
  children,
  variant = 'info',
  className = '',
}) {
  const styles = {
    success: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900',
    error: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900',
    warning: 'bg-amber-105 bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-955 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900',
    info: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900',
    neutral: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}

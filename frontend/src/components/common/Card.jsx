export default function Card({
  children,
  title,
  subtitle,
  actions,
  className = '',
}) {
  return (
    <div className={`bg-white dark:bg-gov-cardDark border border-slate-200 dark:border-slate-850 rounded-xl shadow-xs overflow-hidden ${className}`}>
      {(title || subtitle || actions) && (
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            {title && <h4 className="text-sm font-bold text-slate-800 dark:text-slate-150">{title}</h4>}
            {subtitle && <p className="text-xs text-slate-450 dark:text-slate-450">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

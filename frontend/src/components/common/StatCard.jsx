export default function StatCard({
  title,
  value,
  icon,
  trend,
  trendType = 'neutral', // 'success' | 'danger' | 'neutral'
  className = '',
}) {
  const trendColors = {
    success: 'text-emerald-600 dark:text-emerald-450 font-medium',
    danger: 'text-rose-600 dark:text-rose-455 font-medium',
    neutral: 'text-slate-450 dark:text-slate-450',
  };

  return (
    <div className={`bg-white dark:bg-gov-cardDark border border-slate-205 dark:border-slate-850 rounded-xl p-6 shadow-xs flex items-center justify-between gap-4 ${className}`}>
      <div className="space-y-2 min-w-0">
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">
          {title}
        </p>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight leading-none">
          {value}
        </h3>
        {trend && (
          <p className={`text-[11px] ${trendColors[trendType]}`}>
            {trend}
          </p>
        )}
      </div>
      
      {icon && (
        <div className="h-12 w-12 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
          {icon}
        </div>
      )}
    </div>
  );
}

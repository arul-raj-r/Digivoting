import { AlertCircle, CheckCircle, Info, Key, Shield } from 'lucide-react';

export default function Timeline({ items = [], className = '' }) {
  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-rose-500" />;
      case 'auth':
        return <Key className="h-4 w-4 text-gov-blue dark:text-gov-slate" />;
      default:
        return <Info className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className={`flow-root ${className}`}>
      <ul className="-mb-8">
        {items.map((item, itemIdx) => (
          <li key={item.id || itemIdx}>
            <div className="relative pb-8">
              {itemIdx !== items.length - 1 ? (
                <span
                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200 dark:bg-slate-805"
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className="h-8 w-8 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center ring-8 ring-white dark:ring-gov-cardDark shrink-0">
                    {getIcon(item.type)}
                  </span>
                </div>
                <div className="flex-grow pt-1.5 flex justify-between space-x-4 min-w-0">
                  <div className="min-w-0 flex-grow">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-[11px] text-slate-450 dark:text-slate-450 mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-[10px] text-slate-400 dark:text-slate-550 shrink-0 whitespace-nowrap pt-0.5">
                    <time dateTime={item.timestamp}>{item.timestamp}</time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

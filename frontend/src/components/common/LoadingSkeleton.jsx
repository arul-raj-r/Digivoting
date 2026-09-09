import Skeleton from './Skeleton';

export default function LoadingSkeleton({ variant = 'cards', count = 3 }) {
  if (variant === 'cards') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-gov-cardDark shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton width="40%" height="20px" />
              <Skeleton width="20%" height="18px" />
            </div>
            <Skeleton width="85%" height="16px" />
            <Skeleton width="60%" height="14px" />
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <Skeleton width="30%" height="14px" />
              <Skeleton width="25%" height="32px" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-gov-cardDark p-4 space-y-3">
        <div className="flex justify-between items-center mb-4">
          <Skeleton width="30%" height="24px" />
          <Skeleton width="15%" height="32px" />
        </div>
        {Array.from({ length: count || 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800">
            <Skeleton width="25%" height="18px" />
            <Skeleton width="30%" height="16px" />
            <Skeleton width="15%" height="16px" />
            <Skeleton width="10%" height="28px" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'metrics') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: count || 4 }).map((_, i) => (
          <div key={i} className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-gov-cardDark space-y-2">
            <Skeleton width="40%" height="14px" />
            <Skeleton width="60%" height="28px" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6 bg-white dark:bg-gov-cardDark rounded-xl border border-slate-200 dark:border-slate-800">
      <Skeleton width="60%" height="28px" />
      <Skeleton width="100%" height="18px" />
      <Skeleton width="80%" height="18px" />
    </div>
  );
}

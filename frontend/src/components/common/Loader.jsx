import { Loader2 } from 'lucide-react';

export default function Loader({
  message = 'Loading details, please wait...',
  fullPage = false,
}) {
  const containerStyle = fullPage
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/80 dark:bg-gov-dark/80 backdrop-blur-xs'
    : 'flex flex-col items-center justify-center p-8';

  return (
    <div className={containerStyle}>
      <Loader2 className="h-8 w-8 animate-spin text-gov-blue dark:text-gov-slate shrink-0 mb-3" />
      <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{message}</span>
    </div>
  );
}

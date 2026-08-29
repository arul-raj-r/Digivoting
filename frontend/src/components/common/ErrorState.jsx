import { ShieldAlert } from 'lucide-react';
import Button from './Button';

export default function ErrorState({
  title = 'System connection error',
  message = 'We encountered an error communicating with the authentication and election services. Please verify your connection and try again.',
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-rose-100 dark:border-rose-950 bg-rose-50/20 dark:bg-rose-955 dark:bg-rose-950/10 rounded-xl">
      <div className="mb-4 text-rose-500">
        <ShieldAlert className="h-10 w-10" />
      </div>
      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">{title}</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-6 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry Connection
        </Button>
      )}
    </div>
  );
}

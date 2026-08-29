import { FolderOpen } from 'lucide-react';
import Button from './Button';

export default function EmptyState({
  title = 'No records found',
  description = 'There is currently no data available in this section.',
  icon = <FolderOpen className="h-10 w-10 text-slate-400" />,
  actionLabel,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl bg-white dark:bg-gov-cardDark/50">
      <div className="mb-4 text-slate-405">{icon}</div>
      <h4 className="text-sm font-bold text-slate-850 dark:text-slate-200 mb-1">{title}</h4>
      <p className="text-xs text-slate-450 dark:text-slate-450 max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

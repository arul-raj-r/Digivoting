import React from 'react';
import { 
  Calendar, 
  Pencil, 
  Pause, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle 
} from 'lucide-react';

export default function StatusBadge({ status, className = '', showIcon = true }) {
  if (!status) return null;
  const normalized = String(status).toUpperCase();

  let styles = 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  let label = status;
  let icon = null;

  switch (normalized) {
    case 'ACTIVE':
    case 'LIVE':
      styles = 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      label = normalized === 'LIVE' ? 'Live' : 'Active';
      icon = (
        <span className="relative flex h-2 w-2 mr-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      );
      break;

    case 'SUCCESS':
    case 'VERIFIED':
      styles = 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      label = normalized === 'SUCCESS' ? 'Success' : 'Verified';
      icon = <CheckCircle2 className="w-3 h-3 mr-1 shrink-0 text-emerald-600 dark:text-emerald-400" />;
      break;

    case 'SCHEDULED':
    case 'CONFIGURED':
      styles = 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
      label = normalized === 'SCHEDULED' ? 'Scheduled' : 'Configured';
      icon = <Calendar className="w-3 h-3 mr-1 shrink-0 text-blue-600 dark:text-blue-400" />;
      break;

    case 'COMPLETED':
    case 'ENDED':
      styles = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700';
      label = 'Completed';
      icon = <CheckCircle2 className="w-3 h-3 mr-1 shrink-0 text-slate-500 dark:text-slate-400" />;
      break;

    case 'DRAFT':
      styles = 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700';
      label = 'Draft';
      icon = <Pencil className="w-2.5 h-2.5 mr-1 shrink-0 text-slate-400" />;
      break;

    case 'PAUSED':
      styles = 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      label = 'Paused';
      icon = <Pause className="w-3 h-3 mr-1 shrink-0 text-amber-600 dark:text-amber-400" />;
      break;

    case 'PENDING':
    case 'PENDING_EMAIL_VERIFICATION':
    case 'PROCESSING':
    case 'UNDER_REVIEW':
      styles = 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      label = normalized === 'PENDING_EMAIL_VERIFICATION' ? 'Email Pending' : normalized === 'UNDER_REVIEW' ? 'Under Review' : 'Pending';
      icon = <Clock className="w-3 h-3 mr-1 shrink-0 text-amber-600 dark:text-amber-400" />;
      break;

    case 'CANCELLED':
    case 'FAILED':
    case 'EXPIRED':
    case 'LOCKED':
    case 'SUSPENDED':
    case 'REJECTED':
      styles = 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
      label = normalized === 'CANCELLED' ? 'Cancelled' : normalized === 'LOCKED' ? 'Locked' : normalized === 'SUSPENDED' ? 'Suspended' : normalized === 'REJECTED' ? 'Rejected' : 'Failed';
      icon = <XCircle className="w-3 h-3 mr-1 shrink-0 text-rose-600 dark:text-rose-400" />;
      break;

    default:
      styles = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      label = status;
      icon = <AlertCircle className="w-3 h-3 mr-1 shrink-0 text-slate-400" />;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles} ${className}`}>
      {showIcon && icon}
      <span>{label}</span>
    </span>
  );
}

import Badge from './Badge';

export default function StatusBadge({ status, className = '' }) {
  if (!status) return null;
  const normalized = String(status).toUpperCase();

  let variant = 'neutral';
  let label = status;

  switch (normalized) {
    case 'ACTIVE':
    case 'SUCCESS':
    case 'VERIFIED':
      variant = 'success';
      label = normalized === 'ACTIVE' ? 'Active' : normalized === 'SUCCESS' ? 'Success' : 'Verified';
      break;

    case 'COMPLETED':
      variant = 'info';
      label = 'Completed';
      break;

    case 'SCHEDULED':
      variant = 'info';
      label = 'Scheduled';
      break;

    case 'CONFIGURED':
      variant = 'info';
      label = 'Configured';
      break;

    case 'DRAFT':
      variant = 'neutral';
      label = 'Draft';
      break;

    case 'PENDING':
    case 'PENDING_EMAIL_VERIFICATION':
    case 'PROCESSING':
    case 'UNDER_REVIEW':
      variant = 'warning';
      label = normalized === 'PENDING_EMAIL_VERIFICATION' ? 'Email Pending' : normalized === 'UNDER_REVIEW' ? 'Under Review' : 'Pending';
      break;

    case 'CANCELLED':
    case 'FAILED':
    case 'EXPIRED':
    case 'LOCKED':
    case 'SUSPENDED':
    case 'REJECTED':
      variant = 'danger';
      label = normalized === 'CANCELLED' ? 'Cancelled' : normalized === 'LOCKED' ? 'Locked' : normalized === 'SUSPENDED' ? 'Suspended' : normalized === 'REJECTED' ? 'Rejected' : 'Failed';
      break;

    default:
      variant = 'neutral';
      label = status;
  }

  return (
    <Badge variant={variant} className={`font-semibold tracking-wide ${className}`}>
      {label}
    </Badge>
  );
}

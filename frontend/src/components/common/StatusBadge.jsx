import Badge from './Badge';

export default function StatusBadge({ status, className = '' }) {
  const normalized = String(status).toUpperCase();

  // Status mapping to Badge variants
  // Expected statuses: VERIFIED, ACTIVE, PENDING, COMPLETED, PROCESSING, FAILED, EXPIRED, NOT STARTED
  let variant = 'neutral';
  let text = status;

  switch (normalized) {
    case 'VERIFIED':
    case 'ACTIVE':
    case 'SUCCESS':
    case 'COMPLETED':
      variant = 'success';
      text = status === 'SUCCESS' ? 'Succeeded' : status;
      break;
    case 'PENDING':
    case 'PROCESSING':
    case 'ENROLLED':
      variant = 'warning';
      break;
    case 'FAILED':
    case 'EXPIRED':
    case 'SUSPENDED':
      variant = 'danger';
      break;
    case 'NOT_STARTED':
    case 'NOT STARTED':
    case 'UNAVAILABLE':
      variant = 'neutral';
      text = status === 'NOT_STARTED' ? 'Not Started' : status;
      break;
    default:
      variant = 'info';
  }

  return (
    <Badge variant={variant} className={className}>
      {text}
    </Badge>
  );
}

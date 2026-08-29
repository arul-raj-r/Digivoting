export default function Avatar({
  name = '',
  size = 'md',
  src,
  className = '',
}) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-16 w-16 text-xl',
  };

  const getInitials = (fullName) => {
    return fullName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0 ${sizes[size]} ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-gov-blue text-white flex items-center justify-center font-bold select-none border border-gov-blue/10 dark:bg-gov-slate dark:text-slate-900 shrink-0 ${sizes[size]} ${className}`}
    >
      {getInitials(name) || 'U'}
    </div>
  );
}

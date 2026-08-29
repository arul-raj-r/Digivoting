import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';
  
  const variants = {
    primary: 'bg-gov-blue hover:bg-gov-darkblue text-white focus:ring-gov-blue dark:bg-gov-slate dark:hover:bg-slate-400 dark:text-slate-900',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 focus:ring-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-205',
    outline: 'border border-slate-300 hover:bg-slate-50 text-slate-700 focus:ring-gov-blue dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/50',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500',
    ghost: 'hover:bg-slate-100 text-slate-600 hover:text-slate-850 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />}
      {children}
    </button>
  );
}

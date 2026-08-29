import { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  id,
  type = 'text',
  error,
  helperText,
  className = '',
  required = false,
  ...props
}, ref) => {
  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label 
          htmlFor={id} 
          className="text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        type={type}
        required={required}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
        className={`w-full px-3.5 py-2 rounded-lg border text-sm bg-white dark:bg-gov-cardDark text-slate-800 dark:text-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          error
            ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500'
            : 'border-slate-300 focus:ring-gov-blue dark:border-slate-750 dark:focus:ring-gov-gold'
        }`}
        {...props}
      />
      {error && (
        <span 
          id={`${id}-error`} 
          className="text-xs font-medium text-rose-600 dark:text-rose-455"
          role="alert"
        >
          {error}
        </span>
      )}
      {!error && helperText && (
        <span 
          id={`${id}-helper`} 
          className="text-[11px] text-slate-450 dark:text-slate-450"
        >
          {helperText}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;

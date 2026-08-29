import { forwardRef } from 'react';

const Checkbox = forwardRef(({
  label,
  id,
  error,
  className = '',
  ...props
}, ref) => {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-start gap-2.5">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className="h-4.5 w-4.5 rounded border-slate-300 text-gov-blue focus:ring-gov-blue dark:border-slate-700 dark:bg-gov-cardDark dark:focus:ring-gov-gold shrink-0 mt-0.5"
          {...props}
        />
        {label && (
          <label 
            htmlFor={id} 
            className="text-xs text-slate-650 dark:text-slate-300 select-none leading-normal font-medium"
          >
            {label}
          </label>
        )}
      </div>
      {error && (
        <span 
          className="text-xs font-medium text-rose-600 dark:text-rose-455 pl-7"
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';
export default Checkbox;

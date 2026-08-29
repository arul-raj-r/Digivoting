import { forwardRef } from 'react';

const Radio = forwardRef(({
  label,
  id,
  name,
  error,
  className = '',
  ...props
}, ref) => {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center gap-2.5">
        <input
          ref={ref}
          id={id}
          name={name}
          type="radio"
          className="h-4 w-4 border-slate-300 text-gov-blue focus:ring-gov-blue dark:border-slate-700 dark:bg-gov-cardDark dark:focus:ring-gov-gold shrink-0"
          {...props}
        />
        {label && (
          <label 
            htmlFor={id} 
            className="text-sm text-slate-650 dark:text-slate-350 select-none font-medium"
          >
            {label}
          </label>
        )}
      </div>
      {error && (
        <span 
          className="text-xs font-medium text-rose-600 dark:text-rose-455 pl-6"
          role="alert"
        >
          {error}
        </span>
      )}
    </div>
  );
});

Radio.displayName = 'Radio';
export default Radio;

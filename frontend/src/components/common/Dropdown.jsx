import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function Dropdown({
  trigger,
  items = [],
  align = 'right',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => setIsOpen((prev) => !prev);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const alignments = {
    left: 'left-0 origin-top-left',
    right: 'right-0 origin-top-right',
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <div onClick={toggleDropdown} className="cursor-pointer">
        {trigger || (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-xs rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Options
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          className={`absolute mt-2 w-48 rounded-lg bg-white dark:bg-gov-cardDark border border-slate-200 dark:border-slate-800 shadow-lg py-1 z-50 text-sm focus:outline-none ${alignments[align]}`}
          role="menu"
          aria-orientation="vertical"
        >
          {items.map((item, index) => {
            if (item.divider) {
              return <div key={index} className="border-t border-slate-100 dark:border-slate-800 my-1" />;
            }

            return (
              <button
                key={item.label || index}
                onClick={() => {
                  setIsOpen(false);
                  if (item.onClick) item.onClick();
                }}
                className={`w-full text-left px-4 py-2 text-slate-650 hover:bg-slate-100 dark:text-slate-350 dark:hover:bg-slate-800 transition-colors ${
                  item.danger ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-455 dark:hover:bg-rose-950/20' : ''
                }`}
                role="menuitem"
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

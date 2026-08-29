import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Breadcrumb({ items = [], className = '' }) {
  return (
    <nav className={`flex text-xs text-slate-400 font-medium ${className}`} aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-2">
        <li className="inline-flex items-center">
          <Link to="/" className="inline-flex items-center hover:text-slate-600 dark:hover:text-slate-205">
            <Home className="h-3.5 w-3.5 mr-1.5 shrink-0" />
            Home
          </Link>
        </li>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={item.path} className="flex items-center">
              <ChevronRight className="h-3.5 w-3.5 mx-1 text-slate-350" />
              {isLast ? (
                <span className="text-slate-600 dark:text-slate-200 font-semibold" aria-current="page">
                  {item.name}
                </span>
              ) : (
                <Link to={item.path} className="hover:text-slate-600 dark:hover:text-slate-205">
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

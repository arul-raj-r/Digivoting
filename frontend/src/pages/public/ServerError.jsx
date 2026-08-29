import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';

export default function ServerError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gov-dark p-6 text-center text-slate-800 dark:text-slate-100">
      <div className="max-w-md w-full space-y-6">
        <ShieldAlert className="h-16 w-16 mx-auto text-amber-500" />
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight">500</h1>
          <h2 className="text-lg font-bold">System Error</h2>
          <p className="text-sm text-slate-455 dark:text-slate-400 leading-relaxed">
            The portal is currently experiencing a technical interruption. Our security and database engineering teams are conducting diagnostic reviews.
          </p>
        </div>
        <div className="flex justify-center gap-4">
          <Link to="/">
            <Button variant="primary">Return Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

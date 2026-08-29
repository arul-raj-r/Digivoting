import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/common/Loader';
import Alert from '../../components/common/Alert';
import Button from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';

export default function SecurityCheck() {
  const { checkAuth } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // 'checking' | 'error'

  useEffect(() => {
    async function verify() {
      try {
        await checkAuth();
        navigate('/dashboard', { replace: true });
      } catch (e) {
        setStatus('error');
      }
    }
    const timer = setTimeout(verify, 1500);
    return () => clearTimeout(timer);
  }, [checkAuth, navigate]);

  if (status === 'checking') {
    return <Loader message="Conducting secure integrity scan on your browser session..." fullPage />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gov-dark p-6 text-center text-slate-800 dark:text-slate-100">
      <div className="max-w-md w-full space-y-6">
        <Alert type="error" title="Session Scan Terminated">
          The browser integrity scan failed to confirm security context. Check if cookies are enabled.
        </Alert>
        <Button variant="primary" className="w-full" onClick={() => navigate('/login')}>
          Proceed to Login
        </Button>
      </div>
    </div>
  );
}

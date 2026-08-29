import { useState, useEffect } from 'react';
import { Mail, ShieldCheck, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import { authService } from '../../services/authService';
import { useToast } from '../../context/ToastContext';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { showSuccess, showError } = useToast();
  const token = searchParams.get('token');

  // Email can come from navigation state (after registration) or query param
  const emailFromState = location.state?.email || '';

  const [status, setStatus] = useState(token ? 'verifying' : 'idle');
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState(emailFromState);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!token) return;

    const performVerification = async () => {
      try {
        const res = await authService.verifyEmail(token);
        setStatus('success');
        setMessage(res.message || 'Email verified successfully. You may now log in.');
      } catch (err) {
        setStatus('error');
        setMessage(err.message || 'Verification failed. The token may be invalid or expired.');
      }
    };

    performVerification();
  }, [token]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (!resendEmail) {
      showError('Please enter your email address.');
      return;
    }
    setIsResending(true);
    try {
      await authService.resendEmailVerification(resendEmail);
      showSuccess('Verification email sent! Please check your inbox.');
      setResendCooldown(60);
    } catch (err) {
      showError(err.message || 'Failed to resend verification email. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  if (status === 'verifying') {
    return (
      <div className="space-y-6 text-center py-6">
        <div className="flex justify-center">
          <Loader2 className="h-12 w-12 text-gov-blue animate-spin" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Verifying Your Email</h2>
          <p className="text-xs text-slate-500">Please wait while we validate your activation token...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="h-6 w-6" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Email Verified!</h2>
          <p className="text-xs text-slate-500 leading-relaxed">{message}</p>
        </div>

        <Alert type="success">
          <div className="text-left text-xs">
            <p className="font-bold flex items-center gap-1.5 mb-1 text-emerald-800 dark:text-emerald-200">
              <ShieldCheck className="h-4 w-4" />
              Profile Activated
            </p>
            <p>
              Your account has been activated. Please proceed to login to set up your voter credentials.
            </p>
          </div>
        </Alert>

        <div className="pt-4">
          <Link to="/login">
            <Button variant="primary" className="w-full">
              Proceed to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <XCircle className="h-6 w-6" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Verification Failed</h2>
          <p className="text-xs text-rose-500 leading-relaxed">{message}</p>
        </div>

        <div className="pt-4 flex flex-col gap-3">
          <Link to="/register">
            <Button variant="primary" className="w-full">
              Register Again
            </Button>
          </Link>
          <Link to="/login" className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // default idle screen — shown after registration
  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div className="h-12 w-12 rounded-full bg-gov-blue/10 dark:bg-gov-slate/10 flex items-center justify-center text-gov-blue dark:text-gov-slate">
          <Mail className="h-6 w-6" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold">Verify Your Email</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          We have dispatched a validation link to your registered email address. Click the link inside the email to activate your user profile.
        </p>
      </div>

      <Alert type="info">
        <div className="text-left text-xs">
          <p className="font-bold flex items-center gap-1.5 mb-1 text-slate-800 dark:text-slate-200">
            <ShieldCheck className="h-4 w-4" />
            Verification Notice
          </p>
          <p>
            Email confirmation activates your basic user login profile. It does NOT automatically certify you as a verified voter. You must complete voter eligibility verification in the dashboard afterwards.
          </p>
        </div>
      </Alert>

      {/* Resend section */}
      <div className="space-y-3">
        {!emailFromState && (
          <div className="text-left">
            <label htmlFor="resendEmail" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="resendEmail"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder="Enter your registered email"
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-gov-blue focus:border-transparent outline-none transition-all"
            />
          </div>
        )}

        <button
          type="button"
          onClick={handleResend}
          disabled={isResending || resendCooldown > 0}
          className="text-xs font-semibold text-gov-blue dark:text-gov-slate hover:underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isResending
            ? 'Sending...'
            : resendCooldown > 0
              ? `Resend email link (${resendCooldown}s)`
              : 'Resend email link'}
        </button>
      </div>

      <div className="pt-4 flex flex-col gap-3">
        <Link to="/login">
          <Button variant="primary" className="w-full">
            Proceed to Login
          </Button>
        </Link>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { 
  Vote, 
  ShieldCheck, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Loader2, 
  Lock, 
  Sun, 
  Moon,
  Mail,
  KeyRound
} from 'lucide-react';
import { verifyOTP, resendOTP } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Laptop } from 'lucide-react';

export default function VerifyOTP() {
  const location = useLocation();
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const { themeMode, cycleTheme, resolvedTheme } = useTheme();

  // Retrieve pre-auth details from Module 2/3 login handoff
  const email = location.state?.email || 'citizen@digivote.org';
  const destination = location.state?.destination || {};
  // Strictly display email ONLY (no mobile number)
  const displayEmail = destination.masked_email || email;
  const preAuthToken = location.state?.preAuthToken || location.state?.challengeId;

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [isShaking, setIsShaking] = useState(false);
  const [sessionLocked, setSessionLocked] = useState(false);

  // Dynamic validity timer (defaults to 300s / 5:00)
  const [validityTime, setValidityTime] = useState(location.state?.expiresInSeconds || 300);

  // Dynamic resend cooldown timer (defaults to 30s)
  const [cooldown, setCooldown] = useState(location.state?.cooldownSeconds || 30);

  const inputRefs = useRef([]);

  // Guard: If arrived without preAuthToken, redirect back to login
  useEffect(() => {
    if (!preAuthToken) {
      navigate('/login', { replace: true });
    }
  }, [preAuthToken, navigate]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0] && !sessionLocked) {
      inputRefs.current[0].focus();
    }
  }, [sessionLocked]);

  // Validity countdown timer
  useEffect(() => {
    if (validityTime <= 0) return;
    const timer = setInterval(() => {
      setValidityTime((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [validityTime]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleDigitChange = (index, value) => {
    if (sessionLocked || isVerifying) return;

    // Handle single character numeric input
    const char = value.slice(-1);
    if (char && !/^\d$/.test(char)) return;

    const nextDigits = [...digits];
    nextDigits[index] = char;
    setDigits(nextDigits);
    setErrorMessage('');

    // Auto-advance
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits filled
    const fullOtp = nextDigits.join('');
    if (fullOtp.length === 6 && !nextDigits.includes('')) {
      submitVerification(fullOtp);
    }
  };

  const handleKeyDown = (index, e) => {
    if (sessionLocked || isVerifying) return;

    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else {
        const nextDigits = [...digits];
        nextDigits[index] = '';
        setDigits(nextDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    if (sessionLocked || isVerifying) return;

    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const splitDigits = pastedData.split('');
      setDigits(splitDigits);
      inputRefs.current[5]?.focus();
      submitVerification(pastedData);
    }
  };

  const submitVerification = async (codeToVerify) => {
    const otpCode = codeToVerify || digits.join('');
    if (otpCode.length !== 6) return;

    setIsVerifying(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await verifyOTP(preAuthToken, otpCode);
      
      // Store session tokens
      if (res.tokens?.access) {
        localStorage.setItem('digivote_access_token', res.tokens.access);
        localStorage.setItem('digivote_refresh_token', res.tokens.refresh);
      }
      if (res.user) {
        localStorage.setItem('digivote_user', JSON.stringify(res.user));
      }

      // Revalidate AuthContext state immediately
      await checkAuth();

      setSuccessMessage('Identity verified! Redirecting to dashboard...');

      setTimeout(() => {
        const fromPath = location.state?.from?.pathname;
        const role = res.user?.role;
        const isStaff = res.user?.is_staff || res.user?.is_superuser;
        const isCreatorOrAdmin = role === 'ELECTION_CREATOR' || role === 'ADMIN' || isStaff;

        if (fromPath && fromPath !== '/login' && fromPath !== '/verify-otp') {
          if (fromPath.startsWith('/elections') && !isCreatorOrAdmin) {
            navigate('/dashboard', { replace: true });
          } else {
            navigate(fromPath, { replace: true });
          }
        } else {
          navigate('/dashboard', { replace: true });
        }
      }, 600);

    } catch (err) {
      triggerShake();
      if (err.code === 'MAX_ATTEMPTS_EXCEEDED') {
        setSessionLocked(true);
        setErrorMessage('Too many incorrect attempts. Your security session has been locked for safety.');
        setTimeout(() => {
          navigate('/login', {
            state: { error: 'Authentication session locked due to multiple incorrect OTP attempts. Please sign in again.' },
            replace: true,
          });
        }, 3000);
      } else if (err.code === 'PRE_AUTH_EXPIRED' || err.code === 'PRE_AUTH_REUSED') {
        setSessionLocked(true);
        setErrorMessage('Authentication session expired. Please return to login.');
        setTimeout(() => navigate('/login', { replace: true }), 2500);
      } else if (err.code === 'OTP_EXPIRED') {
        setErrorMessage('The verification code has expired. Please click "Resend Code" below.');
      } else {
        setErrorMessage(err.message || 'Invalid verification code.');
        if (err.attemptsRemaining !== null && err.attemptsRemaining !== undefined) {
          setAttemptsRemaining(err.attemptsRemaining);
        }
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending || sessionLocked) return;

    setIsResending(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await resendOTP(preAuthToken);
      setSuccessMessage('A fresh 6-digit code has been dispatched to your email.');
      setCooldown(res.cooldown_seconds || 30);
      setValidityTime(res.expires_in_seconds || 300);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      if (err.code === 'MAX_SENDS_EXCEEDED') {
        setSessionLocked(true);
        setErrorMessage('Maximum resend attempts reached for this session. Please log in again.');
        setTimeout(() => navigate('/login', { replace: true }), 2500);
      } else if (err.code === 'COOLDOWN_ACTIVE') {
        setErrorMessage(`Please wait ${cooldown} seconds before requesting another code.`);
      } else {
        setErrorMessage(err.message || 'Failed to resend verification code. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isCodeComplete = digits.every((d) => d !== '');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between transition-colors duration-200">
      
      {/* Top Navbar */}
      <header className="w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-105 transition-transform">
              <Vote className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white">
                  DigiVote
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                  Security
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Multi-Factor Authentication Gateway
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {/* 3-Mode Dark/Light Switcher */}
            <button
              type="button"
              onClick={cycleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium"
              title={`Theme: ${themeMode.toUpperCase()} (Click to toggle)`}
              aria-label="Toggle theme"
            >
              {themeMode === 'system' ? (
                <Laptop className="h-4 w-4 text-indigo-500" />
              ) : resolvedTheme === 'dark' ? (
                <Moon className="h-4 w-4 text-indigo-400" />
              ) : (
                <Sun className="h-4 w-4 text-amber-500" />
              )}
            </button>

            <Link
              to="/login"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline px-3 py-1.5 inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Verification Card Area */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10">
        <div className="w-full max-w-md">
          
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-6 sm:p-8 space-y-6">
            
            {/* Card Header */}
            <div className="space-y-2 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-200/60 dark:border-indigo-800/60">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Two-Factor Authentication</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Enter Email OTP
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                A 6-digit verification code has been sent to your email:
              </p>
              
              {/* Strictly Email Only Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="font-mono">{displayEmail}</span>
              </div>
            </div>

            {/* Alert Messages */}
            {successMessage && (
              <div role="status" className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div role="alert" className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold">{errorMessage}</p>
                  {attemptsRemaining !== null && !sessionLocked && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400">
                      {attemptsRemaining} attempt{attemptsRemaining === 1 ? '' : 's'} remaining before session lockout.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 6-Digit OTP Grid */}
            <div className={`space-y-2.5 ${isShaking ? 'animate-bounce' : ''}`}>
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Verification Code
                </label>
                <span className={`text-[11px] font-bold font-mono ${validityTime < 60 ? 'text-rose-600 dark:text-rose-400 animate-pulse' : 'text-slate-500 dark:text-slate-400'}`}>
                  Expires in {formatTimer(validityTime)}
                </span>
              </div>

              <div className="flex justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    disabled={sessionLocked || isVerifying || validityTime <= 0}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    aria-label={`Digit ${idx + 1}`}
                    placeholder="•"
                    className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl border transition-all ${
                      errorMessage
                        ? 'border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300'
                        : digit
                        ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                    } ${sessionLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                  />
                ))}
              </div>
            </div>

            {/* Verify Button */}
            <button
              type="button"
              onClick={() => submitVerification()}
              disabled={!isCodeComplete || isVerifying || sessionLocked || validityTime <= 0}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs tracking-wide shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Verify OTP & Sign In</span>
                </>
              )}
            </button>

            {/* Resend Action */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Didn't receive email code?</span>
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || isResending || sessionLocked}
                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline disabled:text-slate-400 dark:disabled:text-slate-600 disabled:no-underline inline-flex items-center gap-1.5"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : cooldown > 0 ? (
                  <span className="font-mono">Resend in {cooldown}s</span>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Resend Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Return to Login */}
            <div className="text-center pt-1">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Sign In</span>
              </Link>
            </div>

          </div>

          {/* Security Badge */}
          <div className="mt-6 flex items-center justify-between px-2 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span>Email Multi-Factor Verification</span>
            </div>
            <span>DigiVote Security v2.4</span>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-500">
        <p>&copy; {new Date().getFullYear()} DigiVote Systems. Organizational Election & Digital Governance Suite.</p>
      </footer>

    </div>
  );
}

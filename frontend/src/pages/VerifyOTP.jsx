import { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Loader2, 
  Lock, 
  Sun, 
  Moon,
  Laptop,
  Mail,
  KeyRound
} from 'lucide-react';
import { verifyOTP, resendOTP } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function VerifyOTP() {
  const location = useLocation();
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const { themeMode, cycleTheme, resolvedTheme } = useTheme();

  // Retrieve pre-auth details from login handoff
  const email = location.state?.email || 'citizen@digivote.org';
  const destination = location.state?.destination || {};
  const displayEmail = destination.masked_email || email;
  const preAuthToken = location.state?.preAuthToken || location.state?.challengeId;
  const returnUrl = location.state?.returnUrl || '/dashboard';

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

    const char = value.slice(-1);
    if (char && !/^\d$/.test(char)) return;

    const nextDigits = [...digits];
    nextDigits[index] = char;
    setDigits(nextDigits);
    setErrorMessage('');

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

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

      setSuccessMessage('Identity verified! Accessing your session...');

      setTimeout(() => {
        // Direct seamless navigation to preserved returnUrl (or /dashboard)
        const targetPath = (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) ? returnUrl : '/dashboard';
        navigate(targetPath, { replace: true });
      }, 500);

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
      setSuccessMessage('A fresh verification code has been dispatched to your email.');
      setCooldown(res.cooldownSeconds || 30);
      setValidityTime(res.expiresInSeconds || 300);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      if (err.code === 'COOLDOWN_ACTIVE') {
        setErrorMessage(`Please wait ${err.retryAfterSeconds || 30} seconds before requesting another code.`);
        setCooldown(err.retryAfterSeconds || 30);
      } else if (err.code === 'MAX_RESEND_EXCEEDED') {
        setErrorMessage('Maximum code requests reached for this session. Please log in again.');
      } else {
        setErrorMessage(err.message || 'Failed to resend code. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-4 sm:p-6 bg-[#f7f5f0] dark:bg-[#101216] text-[#101216] dark:text-[#f7f5f0] transition-colors duration-200">
      
      {/* Top Bar */}
      <header className="w-full max-w-lg flex items-center justify-between py-2">
        <Link 
          to="/login" 
          className="inline-flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to sign in</span>
        </Link>
        
        <button
          type="button"
          onClick={cycleTheme}
          className="p-1.5 rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-[#171a20] transition-colors flex items-center gap-1.5 text-xs font-mono"
          title={`Theme: ${themeMode.toUpperCase()}`}
          aria-label="Toggle theme"
        >
          {themeMode === 'system' ? (
            <Laptop className="h-3.5 w-3.5 text-stone-600 dark:text-stone-300" />
          ) : resolvedTheme === 'dark' ? (
            <Moon className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Sun className="h-3.5 w-3.5 text-amber-600" />
          )}
          <span className="text-[10px] uppercase font-mono tracking-wider">{themeMode}</span>
        </button>
      </header>

      {/* Main Form Card */}
      <main className="w-full max-w-md my-auto">
        <div className="bg-white dark:bg-[#171a20] border border-stone-200 dark:border-[#262a33] rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#1a4231] text-emerald-300 mb-1 border border-emerald-500/20 shadow-xs">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Two-Factor Authentication
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
              Enter the 6-digit security code sent to
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-stone-100 dark:bg-[#101216] border border-stone-200 dark:border-[#262a33] text-xs font-mono font-medium text-stone-800 dark:text-stone-200">
              <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{displayEmail}</span>
            </div>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div 
              role="alert"
              className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{errorMessage}</p>
                {attemptsRemaining !== null && attemptsRemaining !== undefined && attemptsRemaining > 0 && (
                  <p className="mt-1 text-[11px] opacity-90">
                    {attemptsRemaining} {attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining before session lock.
                  </p>
                )}
              </div>
            </div>
          )}

          {successMessage && (
            <div 
              role="status"
              className="p-3.5 rounded-lg bg-emerald-50 dark:bg-[#1a4231]/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 6-Digit OTP Input Grid */}
          <div className="space-y-4">
            <div 
              className={`flex justify-center gap-2 sm:gap-2.5 ${isShaking ? 'animate-shake' : ''}`}
              onPaste={handlePaste}
            >
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  disabled={sessionLocked || isVerifying}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  aria-label={`Digit ${idx + 1} of 6`}
                  className={`w-11 h-12 sm:w-12 sm:h-14 text-center font-mono text-xl sm:text-2xl font-bold rounded-lg border transition-all ${
                    sessionLocked
                      ? 'bg-stone-100 dark:bg-[#101216] border-stone-200 dark:border-[#262a33] text-stone-400 cursor-not-allowed'
                      : digit
                      ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/20 dark:bg-[#1a4231]/20 text-stone-900 dark:text-white'
                      : 'border-stone-300 dark:border-[#262a33] bg-white dark:bg-[#101216] text-stone-900 dark:text-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600'
                  } outline-none`}
                />
              ))}
            </div>

            {/* Timers & Status Bar */}
            <div className="flex items-center justify-between text-xs px-1 text-stone-500 dark:text-stone-400">
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <Lock className="w-3.5 h-3.5 text-stone-400" />
                <span>Code expires in:</span>
                <span className={`font-semibold ${validityTime < 60 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-stone-800 dark:text-stone-200'}`}>
                  {formatTime(validityTime)}
                </span>
              </span>

              {/* Resend Action */}
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || isResending || sessionLocked}
                className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold disabled:opacity-40 disabled:hover:no-underline cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
              >
                {isResending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                <span>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </span>
              </button>
            </div>
          </div>

          {/* Manual Submit Button */}
          <div>
            <button
              type="button"
              onClick={() => submitVerification()}
              disabled={isVerifying || sessionLocked || digits.includes('')}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#101216] hover:bg-[#171a20] dark:bg-[#1a4231] dark:hover:bg-[#1f4f3b] disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer border border-[#262a33] dark:border-emerald-700/40"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Verifying security token...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Confirm and continue</span>
                </>
              )}
            </button>
          </div>

          {/* Trust Banner */}
          <div className="pt-2 border-t border-stone-100 dark:border-[#262a33] text-center">
            <p className="text-[11px] text-stone-500 font-sans">
              DigiVote single-use authentication protects voting integrity.
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-lg text-center py-4 text-[11px] text-stone-400 font-mono">
        &copy; {new Date().getFullYear()} DigiVote Platform &middot; Institutional Electoral Trust
      </footer>

    </div>
  );
}

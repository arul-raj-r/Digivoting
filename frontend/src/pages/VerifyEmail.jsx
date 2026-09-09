import { useState, useEffect } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { 
  Vote, 
  Mail, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  ArrowLeft, 
  RefreshCw, 
  ShieldCheck, 
  Sun, 
  Moon,
  Inbox
} from 'lucide-react';
import { verifyEmail, resendVerification } from '../api/auth';
import { useTheme } from '../context/ThemeContext';
import { Laptop } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { themeMode, cycleTheme, resolvedTheme } = useTheme();
  const token = searchParams.get('token');

  // Email passed from registration navigation state or user input
  const emailFromState = location.state?.email || '';

  const [status, setStatus] = useState(token ? 'verifying' : 'idle');
  const [message, setMessage] = useState('');
  const [inputEmail, setInputEmail] = useState(emailFromState);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccessMsg, setResendSuccessMsg] = useState('');
  const [resendErrorMsg, setResendErrorMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // 1. Auto-verify on mount if ?token= present in URL
  useEffect(() => {
    if (!token) return;

    const performVerification = async () => {
      setStatus('verifying');
      try {
        const res = await verifyEmail(token);
        setStatus('success');
        setMessage(res.message || 'Email address verified successfully. Your citizen account is now active.');
      } catch (err) {
        setStatus('error');
        if (err.code === 'TOKEN_EXPIRED') {
          setMessage('This activation link has expired (links are valid for 24 hours). Please request a fresh link below.');
        } else if (err.code === 'ALREADY_USED') {
          setMessage('This verification link has already been used.');
        } else {
          setMessage(err.message || 'Invalid or unrecognized verification link.');
        }
      }
    };

    performVerification();
  }, [token]);

  // 2. Cooldown timer countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // 3. Handle Resend Verification Email
  const handleResend = async (e) => {
    if (e) e.preventDefault();
    const targetEmail = inputEmail.trim() || emailFromState.trim();
    if (!targetEmail) {
      setResendErrorMsg('Please enter your registered email address.');
      return;
    }

    setIsResending(true);
    setResendSuccessMsg('');
    setResendErrorMsg('');

    try {
      const res = await resendVerification(targetEmail);
      setResendSuccessMsg(res.message || 'A fresh verification link has been sent to your email.');
      setCooldown(60); // 60s cooldown
    } catch (err) {
      if (err.code === 'COOLDOWN_ACTIVE') {
        setResendErrorMsg('Please wait 60 seconds before requesting another email.');
        setCooldown(60);
      } else {
        setResendErrorMsg(err.message || 'Failed to dispatch verification email. Please try again later.');
      }
    } finally {
      setIsResending(false);
    }
  };

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
                  Platform
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Modern Organizational & Campus Voting
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
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Verification Card Area */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10">
        <div className="w-full max-w-md">
          
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-6 sm:p-8 space-y-6">
            
            {/* 1. VERIFYING STATE */}
            {status === 'verifying' && (
              <div className="p-4 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/40">
                    <Loader2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400 animate-spin" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Verifying Email Address
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Validating your cryptographic activation link with the DigiVote security core...
                  </p>
                </div>
              </div>
            )}

            {/* 2. SUCCESS STATE */}
            {status === 'success' && (
              <div className="space-y-5">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Email Verified!
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {message}
                  </p>
                </div>

                <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Account Successfully Activated</span>
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Your DigiVote profile is now active. You can sign in to participate in organizational elections.
                  </p>
                </div>

                <Link
                  to="/login"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all"
                >
                  <span>Proceed to Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* 3. ERROR STATE */}
            {status === 'error' && (
              <div className="space-y-5">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-800/60">
                    <XCircle className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Verification Failed
                  </h2>
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    {message}
                  </p>
                </div>

                {resendSuccessMsg && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs">
                    {resendSuccessMsg}
                  </div>
                )}

                {resendErrorMsg && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs">
                    {resendErrorMsg}
                  </div>
                )}

                <form onSubmit={handleResend} className="space-y-3">
                  <label htmlFor="resendInput" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Request Fresh Activation Link
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="resendInput"
                      type="email"
                      required
                      placeholder="name@university.edu"
                      value={inputEmail}
                      onChange={(e) => setInputEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isResending || cooldown > 0}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 shadow-md shadow-indigo-600/20 transition-all"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending Link...</span>
                      </>
                    ) : cooldown > 0 ? (
                      <span>Resend in {cooldown}s</span>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Send Fresh Activation Link</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
                  <Link to="/login" className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center gap-1.5">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Return to Sign In</span>
                  </Link>
                </div>
              </div>
            )}

            {/* 4. IDLE STATE (Arrived after registration) */}
            {status === 'idle' && (
              <div className="space-y-5">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-900/40">
                    <Inbox className="w-7 h-7" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Check Your Inbox
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    We sent a secure verification link to your email:
                  </p>
                  {emailFromState && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="font-mono">{emailFromState}</span>
                    </div>
                  )}
                </div>

                {resendSuccessMsg && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs">
                    {resendSuccessMsg}
                  </div>
                )}

                {resendErrorMsg && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs">
                    {resendErrorMsg}
                  </div>
                )}

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Next Steps</span>
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    Click the link in the verification email to activate your account. Links expire in 24 hours.
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending || cooldown > 0}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-xs text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 disabled:opacity-60 transition-all"
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
                        <span>Resend Verification Email</span>
                      </>
                    )}
                  </button>

                  <Link
                    to="/login"
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all"
                  >
                    <span>Back to Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

          </div>

          {/* Security Badge */}
          <div className="mt-6 flex items-center justify-between px-2 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span>SHA-256 Token Verification</span>
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

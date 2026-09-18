import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Vote, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  RefreshCw, 
  ShieldCheck, 
  Sun, 
  Moon,
  Laptop,
  KeyRound
} from 'lucide-react';
import { verifyEmail, resendVerification } from '../api/auth';
import { useTheme } from '../context/ThemeContext';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { themeMode, cycleTheme, resolvedTheme } = useTheme();

  const tokenFromUrl = searchParams.get('token') || '';
  const emailFromUrl = searchParams.get('email') || '';
  const rawReturnUrl = searchParams.get('returnUrl') || location.state?.returnUrl || '';
  const returnUrl = (rawReturnUrl && rawReturnUrl.startsWith('/') && !rawReturnUrl.startsWith('//') && !rawReturnUrl.includes('\\')) 
    ? rawReturnUrl 
    : '/dashboard';
  const emailFromState = location.state?.email || emailFromUrl || '';
  const noticeFromState = location.state?.notice || '';

  const [inputEmail, setInputEmail] = useState(emailFromState);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(Boolean(tokenFromUrl));
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [isResending, setIsResending] = useState(false);
  const [resendStatusMsg, setResendStatusMsg] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // 1. Auto-verify if URL token is supplied (link click fallback)
  useEffect(() => {
    if (!tokenFromUrl) return;

    const runTokenVerification = async () => {
      setIsVerifying(true);
      setErrorMessage('');
      try {
        const res = await verifyEmail(tokenFromUrl);
        setIsSuccess(true);
        setSuccessMessage(res.message || 'Email address verified successfully. Your account is now active.');
      } catch (err) {
        setErrorMessage(err.message || 'Invalid or expired verification link.');
      } finally {
        setIsVerifying(false);
      }
    };

    runTokenVerification();
  }, [tokenFromUrl]);

  // 2. Cooldown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // 3. Handle manual 6-digit OTP verification
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const trimmedEmail = inputEmail.trim().toLowerCase();
    const trimmedOtp = otpCode.trim();

    if (!trimmedEmail) {
      setErrorMessage('Please provide your registered email address.');
      return;
    }
    if (!trimmedOtp || trimmedOtp.length < 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await verifyEmail({
        email: trimmedEmail,
        otp_code: trimmedOtp,
      });
      setIsSuccess(true);
      setSuccessMessage(res.message || 'Email verified successfully! Your account is active.');
    } catch (err) {
      setErrorMessage(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsVerifying(false);
    }
  };

  // 4. Handle resend code
  const handleResendOtp = async () => {
    const trimmedEmail = inputEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address to request a new verification code.');
      return;
    }

    setIsResending(true);
    setResendStatusMsg('');
    setErrorMessage('');

    try {
      const res = await resendVerification(trimmedEmail);
      setResendStatusMsg(res.message || 'A fresh verification code has been dispatched to your email.');
      setCooldown(60);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend verification code. Please wait before trying again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f5f0] dark:bg-[#101216] text-stone-900 dark:text-stone-100 flex flex-col justify-between transition-colors duration-200 font-sans">
      
      {/* Top Header */}
      <header className="w-full border-b border-[#e6e2d8] dark:border-[#272b34] bg-white/90 dark:bg-[#14171b]/90 backdrop-blur-md px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 select-none group">
            <div className="w-8 h-8 rounded-lg bg-[#1a4231] text-white flex items-center justify-center font-bold shadow-xs">
              <Vote className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-base tracking-tight text-stone-900 dark:text-white">
                  DigiVote
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 font-semibold">
                  VERIFICATION
                </span>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={cycleTheme}
              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title={`Theme: ${themeMode.toUpperCase()} (Click to toggle)`}
              aria-label="Toggle theme"
            >
              {themeMode === 'system' ? (
                <Laptop className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              ) : resolvedTheme === 'dark' ? (
                <Moon className="h-4 w-4 text-emerald-400" />
              ) : (
                <Sun className="h-4 w-4 text-amber-600" />
              )}
            </button>

            <Link
              to="/login"
              className="text-xs font-semibold text-[#1a4231] dark:text-emerald-400 hover:underline px-2 py-1 inline-flex items-center gap-1"
            >
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Verification Container */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-md">
          
          <div className="bg-white dark:bg-[#171a20] rounded-xl border border-[#e6e2d8] dark:border-[#272b34] shadow-xs p-6 sm:p-8 space-y-5">
            
            {/* Success State */}
            {isSuccess ? (
              <div className="space-y-5 text-center">
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/50 text-[#1a4231] dark:text-emerald-400 rounded-xl flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h1 className="font-display text-2xl font-bold text-stone-900 dark:text-white">
                    Email Verified
                  </h1>
                  <p className="text-xs text-stone-600 dark:text-stone-400">
                    {successMessage || 'Your account is active. You can now log in.'}
                  </p>
                </div>

                <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg text-xs text-[#1a4231] dark:text-emerald-300 text-left space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Account Active</span>
                  </p>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-400">
                    You can now sign in with your email and password to access elections.
                  </p>
                </div>

                <Link
                  to={returnUrl !== '/dashboard' ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : '/login'}
                  state={{ email: inputEmail.trim(), returnUrl }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-xs text-white bg-[#1a4231] hover:bg-[#143325] shadow-xs transition-all"
                >
                  <span>Proceed to Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              /* OTP Verification Form State */
              <div className="space-y-5">
                <div className="text-center space-y-1.5">
                  <div className="w-12 h-12 bg-[#1a4231]/10 dark:bg-[#1a4231]/30 text-[#1a4231] dark:text-emerald-300 rounded-xl flex items-center justify-center mx-auto border border-[#1a4231]/20 shadow-xs">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h1 className="font-display text-2xl font-bold text-stone-900 dark:text-white tracking-tight">
                    Verify Your Email
                  </h1>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                    Enter the 6-digit verification code sent to your registered email address.
                  </p>
                </div>

                {noticeFromState && !errorMessage && (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs">
                    {noticeFromState}
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {resendStatusMsg && (
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs">
                    {resendStatusMsg}
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  
                  {/* Email Input */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={inputEmail}
                        onChange={(e) => setInputEmail(e.target.value)}
                        placeholder="name@institution.edu"
                        className="w-full pl-9 pr-4 py-2 rounded-lg text-xs bg-[#fdfcfb] dark:bg-[#14171b] border border-[#e6e2d8] dark:border-[#272b34] text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#1a4231] focus:border-[#1a4231] transition-all font-sans"
                      />
                    </div>
                  </div>

                  {/* 6-Digit OTP Code Input */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                      6-Digit Verification Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 123456"
                      className="w-full text-center tracking-[0.5em] text-lg font-mono py-2.5 rounded-lg bg-[#fdfcfb] dark:bg-[#14171b] border border-[#e6e2d8] dark:border-[#272b34] text-stone-900 dark:text-white placeholder-stone-300 focus:outline-none focus:ring-1 focus:ring-[#1a4231] focus:border-[#1a4231] transition-all"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isVerifying || otpCode.length < 6}
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#1a4231] hover:bg-[#143325] disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify Email</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>

                {/* Resend Action & Help */}
                <div className="pt-3 border-t border-[#e6e2d8] dark:border-[#272b34] space-y-2 text-center">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isResending || cooldown > 0}
                    className="text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-[#1a4231] dark:hover:text-emerald-400 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {isResending ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Sending fresh code...</span>
                      </>
                    ) : cooldown > 0 ? (
                      <span className="font-mono">Resend code in {cooldown}s</span>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3" />
                        <span>Resend verification code</span>
                      </>
                    )}
                  </button>

                  <div>
                    <Link
                      to={returnUrl !== '/dashboard' ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : '/login'}
                      className="text-xs text-stone-500 hover:underline"
                    >
                      Already verified? Return to Sign In
                    </Link>
                  </div>
                </div>

              </div>
            )}

          </div>

          <div className="mt-4 text-center text-[11px] text-stone-500 dark:text-stone-400 font-mono">
            DigiVote Identity Security Core
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-[#e6e2d8] dark:border-[#272b34] text-center text-xs text-stone-500">
        &copy; {new Date().getFullYear()} DigiVote Secure Digital Voting Platform
      </footer>

    </div>
  );
}

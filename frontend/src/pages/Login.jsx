import React, { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Shield, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  Sun, 
  Moon, 
  Laptop,
  CheckCircle2, 
  AlertCircle, 
  Key,
  RefreshCw
} from 'lucide-react';
import GoogleLoginButton from '../components/auth/GoogleLoginButton';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, googleLogin } = useAuth();
  const { themeMode, cycleTheme, resolvedTheme } = useTheme();

  // Extract safe return URL for seamless QR code and ballot direct linking
  const rawReturnUrl = searchParams.get('returnUrl') || location.state?.returnUrl || location.state?.from?.pathname || '/dashboard';
  // Ensure returnUrl is a safe relative internal route
  const returnUrl = (rawReturnUrl.startsWith('/') && !rawReturnUrl.startsWith('//')) ? rawReturnUrl : '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);

  const handleGoogleSuccess = React.useCallback(async (credential) => {
    setLoading(true);
    setError(null);
    setNeedsEmailVerification(false);
    try {
      const res = await googleLogin(credential);
      if (res && res.otpRequired) {
        navigate('/verify-otp', {
          state: {
            email: res.email,
            challengeId: res.challengeId,
            preAuthToken: res.preAuthToken || res.challengeId,
            destination: res.destination,
            expiresInSeconds: res.expiresInSeconds || 300,
            cooldownSeconds: res.cooldownSeconds || 30,
            maxAttempts: res.maxAttempts || 3,
            returnUrl: returnUrl
          }
        });
      } else {
        navigate(returnUrl, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Google authentication could not be completed.');
    } finally {
      setLoading(false);
    }
  }, [googleLogin, navigate, returnUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setNeedsEmailVerification(false);

    if (!email.trim() || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      if (res && res.otpRequired) {
        navigate('/verify-otp', {
          state: {
            email: email.trim(),
            challengeId: res.challengeId,
            preAuthToken: res.preAuthToken || res.challengeId,
            destination: res.destination,
            expiresInSeconds: res.expiresInSeconds || 300,
            cooldownSeconds: res.cooldownSeconds || 30,
            maxAttempts: res.maxAttempts || 3,
            returnUrl: returnUrl
          }
        });
      } else {
        navigate(returnUrl, { replace: true });
      }
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.message || 'Invalid credentials.';
      const errorCode = err.code || err.response?.data?.code;
      if (errorCode === 'ACCOUNT_LOCKED') {
        setError(`Security Notice: ${serverMsg}`);
      } else if (
        errorCode === 'EMAIL_NOT_VERIFIED' || 
        errorCode === 'EMAIL_VERIFICATION_REQUIRED' || 
        err.action === 'VERIFY_EMAIL' || 
        (serverMsg && serverMsg.toLowerCase().includes('not verified'))
      ) {
        setNeedsEmailVerification(true);
        setError('Your email is registered but not yet verified. Please complete verification with your email OTP.');
      } else {
        setError(serverMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f7f5f0] dark:bg-[#101216] text-[#101216] dark:text-[#f7f5f0] transition-colors duration-200">
      
      {/* LEFT COLUMN: CIVIC TRUST & PLATFORM ARCHITECTURE */}
      <div className="lg:w-1/2 relative overflow-hidden bg-[#171a20] text-white p-8 lg:p-14 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#262a33]">
        
        {/* Brand Header */}
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-[#1a4231] text-emerald-300 flex items-center justify-center font-bold border border-emerald-500/20 shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-xl tracking-tight text-white">
                  DigiVote
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 font-semibold tracking-wider uppercase">
                  Institutional
                </span>
              </div>
              <span className="text-xs text-stone-400 font-medium">
                Digital Voting & Election Infrastructure
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Security Architecture Panel */}
        <div className="my-8 lg:my-0 relative z-10 flex justify-center">
          <div className="w-full max-w-sm">
            <div className="rounded-xl bg-[#101216] border border-[#262a33] p-6 shadow-sm space-y-4">
              
              <div className="flex items-center justify-between pb-3 border-b border-[#262a33] text-xs">
                <span className="font-medium text-stone-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Electoral Governance System
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-[#1a4231]/40 px-2 py-0.5 rounded border border-emerald-700/40">
                  STANDARD
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-lg bg-[#171a20] border border-[#262a33] flex items-start gap-3">
                  <div className="w-7 h-7 rounded-md bg-[#1a4231] text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Key className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-stone-200">Two-factor identity challenge</p>
                    <p className="text-[11px] text-stone-400 leading-snug">Time-based one-time authentication protecting citizen voter accounts.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#171a20] border border-[#262a33] flex items-start gap-3">
                  <div className="w-7 h-7 rounded-md bg-[#1a4231] text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-stone-200">Roster-verified eligibility</p>
                    <p className="text-[11px] text-stone-400 leading-snug">Ballot access is governed strictly by authorized institutional rosters.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-[#171a20] border border-[#262a33] flex items-start gap-3">
                  <div className="w-7 h-7 rounded-md bg-[#1a4231] text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-stone-200">Confidential ballot decoupling</p>
                    <p className="text-[11px] text-stone-400 leading-snug">Voter identity is permanently segregated from cast ballot selections.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Left Footer Message */}
        <div className="relative z-10 space-y-1">
          <p className="text-xs text-stone-400 leading-relaxed max-w-sm">
            Enforcing organizational election integrity, immutable participation logs, and confidential voting ballots.
          </p>
          <div className="text-[11px] text-stone-500 font-mono pt-1">
            &copy; {new Date().getFullYear()} DigiVote Platform
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: AUTHENTICATION FORM */}
      <div className="lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-16">
        
        {/* Top bar with Theme Switcher & Create Account Link */}
        <div className="flex items-center justify-between pb-8">
          <button
            type="button"
            onClick={cycleTheme}
            className="p-2 rounded-lg text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-[#171a20] transition-colors flex items-center gap-1.5 text-xs font-medium border border-transparent hover:border-stone-300 dark:hover:border-[#262a33]"
            title={`Theme: ${themeMode.toUpperCase()} (Click to toggle)`}
            aria-label="Toggle theme"
          >
            {themeMode === 'system' ? (
              <Laptop className="h-4 w-4 text-stone-600 dark:text-stone-300" />
            ) : resolvedTheme === 'dark' ? (
              <Moon className="h-4 w-4 text-emerald-400" />
            ) : (
              <Sun className="h-4 w-4 text-amber-600" />
            )}
            <span className="text-[11px] uppercase font-mono tracking-wider text-stone-500">
              {themeMode}
            </span>
          </button>

          <div className="text-xs text-stone-600 dark:text-stone-400">
            Don't have an account?{' '}
            <Link
              to={`/register${returnUrl !== '/dashboard' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
              className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Create account
            </Link>
          </div>
        </div>

        {/* Center Form Container */}
        <div className="max-w-md w-full mx-auto my-auto space-y-6">
          
          <div className="space-y-1.5">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              Sign in to DigiVote
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 font-sans">
              Enter your credentials to access your ballots and election workspaces.
            </p>
          </div>

          {/* Destination Notification when returning to an election */}
          {returnUrl !== '/dashboard' && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-[#1a4231]/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>You will be redirected directly to your requested election after sign-in.</span>
            </div>
          )}

          {/* Server Error Alert */}
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              {needsEmailVerification && (
                <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/40 flex justify-end">
                  <Link
                    to={`/verify-email?email=${encodeURIComponent(email.trim())}${returnUrl !== '/dashboard' ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
                    className="inline-flex items-center gap-1.5 font-semibold text-xs bg-rose-700 text-white px-3 py-1.5 rounded hover:bg-rose-800 transition-colors"
                  >
                    <span>Verify email with OTP</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 font-sans">
            
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Registered email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voter@institution.edu"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg text-xs bg-white dark:bg-[#171a20] border border-stone-300 dark:border-[#262a33] text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg text-xs bg-white dark:bg-[#171a20] border border-stone-300 dark:border-[#262a33] text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 dark:border-stone-700 text-emerald-600 focus:ring-emerald-500 dark:bg-stone-900"
                />
                <span className="text-xs text-stone-600 dark:text-stone-400">
                  Remember this session on this device
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#101216] hover:bg-[#171a20] dark:bg-[#1a4231] dark:hover:bg-[#1f4f3b] disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer border border-[#262a33] dark:border-emerald-700/40"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Verifying credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in & continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

          </form>

          {/* Social Auth Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-stone-200 dark:border-[#262a33] w-full" />
            <span className="bg-[#f7f5f0] dark:bg-[#101216] px-3 text-[10px] uppercase font-mono tracking-wider text-stone-400 font-semibold shrink-0">
              OR CONTINUE WITH
            </span>
            <div className="border-t border-stone-200 dark:border-[#262a33] w-full" />
          </div>

          {/* Google OAuth Button */}
          <div>
            <GoogleLoginButton onSuccess={handleGoogleSuccess} disabled={loading} />
          </div>

        </div>

        {/* Bottom Security Notice */}
        <div className="pt-8 text-center text-[11px] text-stone-400">
          <span>Protected by multi-factor authentication & rate limiting</span>
        </div>

      </div>

    </div>
  );
}

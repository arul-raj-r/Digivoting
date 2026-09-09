import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Camera,
  RefreshCw
} from 'lucide-react';
import GoogleLoginButton from '../components/auth/GoogleLoginButton';

export default function Login() {
  const navigate = useNavigate();
  const { login, googleLogin } = useAuth();
  const { themeMode, cycleTheme, resolvedTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
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
            maxAttempts: res.maxAttempts || 3
          }
        });
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.message || 'Invalid credentials.';
      if (err.code === 'ACCOUNT_LOCKED') {
        setError(`Security Notice: ${serverMsg}`);
      } else if (err.code === 'EMAIL_VERIFICATION_REQUIRED') {
        setError('Email verification required. Please check your inbox or verify your account.');
      } else {
        setError(serverMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential) => {
    setLoading(true);
    setError(null);
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
            maxAttempts: res.maxAttempts || 3
          }
        });
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Google authentication could not be completed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* LEFT COLUMN: BRANDING & 3D SECURITY VISUAL */}
      <div className="lg:w-1/2 relative overflow-hidden bg-slate-900 dark:bg-[#050811] text-white p-8 lg:p-16 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
        
        {/* Background ambient lighting */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-white">
                  DigiVote
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                  SECURE
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Secure Digital Voting Platform
              </span>
            </div>
          </Link>
        </div>

        {/* Center: 3D Security Illustration Card */}
        <div className="my-10 lg:my-0 relative z-10 perspective-1000 flex justify-center">
          <div className="w-full max-w-sm card-3d">
            <div className="rounded-2xl bg-[#0d1527]/90 border border-slate-700/60 p-6 shadow-2xl backdrop-blur-md space-y-4">
              
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                <span className="font-bold text-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Protected Identity Portal
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">
                  ONLINE
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">Multi-Factor Token Challenge</p>
                    <p className="text-[10px] text-slate-400">SHA-256 Hashed 6-Digit OTP</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">ArcFace Biometrics Pipeline</p>
                    <p className="text-[10px] text-slate-400">Client-Side Camera Match</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">Confidential Ballot Decoupling</p>
                    <p className="text-[10px] text-slate-400">Time-Truncated Anonymous Storage</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Left Footer Message */}
        <div className="relative z-10 space-y-2">
          <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
            DigiVote enforces strict server-side authentication, account lockouts, and multi-factor verification to safeguard election integrity.
          </p>
          <div className="text-[11px] text-slate-500 font-mono">
            &copy; {new Date().getFullYear()} DigiVote Platform
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: SPLIT-SCREEN AUTHENTICATION CARD */}
      <div className="lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-16">
        
        {/* Top bar with Theme Switcher & Create Account Link */}
        <div className="flex items-center justify-between pb-8">
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
            <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400">
              {themeMode}
            </span>
          </button>

          <div className="text-xs text-slate-500">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Get Started
            </Link>
          </div>
        </div>

        {/* Center Form Container */}
        <div className="max-w-md w-full mx-auto my-auto space-y-6">
          
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Sign in to DigiVote
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Enter your credentials to access the secure voting workspace.
            </p>
          </div>

          {/* Server Error Alert */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@institution.edu"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-900"
                />
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  Remember this session on this device
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

          </form>

          {/* Social Auth Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
            <span className="bg-slate-50 dark:bg-[#070b14] px-3 text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold shrink-0">
              OR CONTINUE WITH
            </span>
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
          </div>

          {/* Google OAuth Button */}
          <div>
            <GoogleLoginButton onSuccess={handleGoogleSuccess} disabled={loading} />
          </div>

        </div>

        {/* Bottom Security Notice */}
        <div className="pt-8 text-center text-[11px] text-slate-400">
          <span>Protected by Multi-Factor Authentication & Rate Limiting</span>
        </div>

      </div>

    </div>
  );
}

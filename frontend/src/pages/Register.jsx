import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { 
  Vote,
  Shield, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sun, 
  Moon, 
  Laptop, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  ShieldCheck,
  Check
} from 'lucide-react';
import { register } from '../api/auth';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawReturnUrl = searchParams.get('returnUrl') || '';
  const returnUrl = (rawReturnUrl && rawReturnUrl.startsWith('/') && !rawReturnUrl.startsWith('//') && !rawReturnUrl.includes('\\')) 
    ? rawReturnUrl 
    : '/dashboard';
  const { themeMode, cycleTheme, resolvedTheme } = useTheme();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Compute password strength
  const getPasswordStrength = (pass) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getPasswordStrength(formData.password);
  const strengthLabels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-stone-300 dark:bg-stone-700', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-600', 'bg-[#1a4231]'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.fullName.trim()) {
      setError('Please provide your full legal name.');
      return;
    }
    if (!formData.email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!formData.mobileNumber.trim()) {
      setError('Please provide a mobile phone number for verification alerts.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register({
        full_name: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        mobile_number: formData.mobileNumber.trim(),
        phone_number: formData.mobileNumber.trim(),
        password: formData.password,
        confirm_password: formData.confirmPassword,
        password_confirmation: formData.confirmPassword,
      });

      // Navigate to email verification with registered email and returnUrl
      const targetVerifyUrl = returnUrl !== '/dashboard'
        ? `/verify-email?email=${encodeURIComponent(formData.email.trim().toLowerCase())}&returnUrl=${encodeURIComponent(returnUrl)}`
        : `/verify-email?email=${encodeURIComponent(formData.email.trim().toLowerCase())}`;

      navigate(targetVerifyUrl, {
        state: { 
          email: formData.email.trim().toLowerCase(),
          returnUrl: returnUrl,
          notice: 'Account registered. Please enter the 6-digit verification code sent to your email.'
        }
      });
    } catch (err) {
      const respData = err.response?.data;
      const errorCode = err.code || respData?.code;
      const errorAction = err.action || respData?.action;

      if (errorCode === 'ACCOUNT_EXISTS_UNVERIFIED' || errorAction === 'VERIFY_EMAIL') {
        const targetVerifyUrl = returnUrl !== '/dashboard'
          ? `/verify-email?email=${encodeURIComponent(formData.email.trim().toLowerCase())}&returnUrl=${encodeURIComponent(returnUrl)}`
          : `/verify-email?email=${encodeURIComponent(formData.email.trim().toLowerCase())}`;

        navigate(targetVerifyUrl, {
          state: { 
            email: formData.email.trim().toLowerCase(),
            returnUrl: returnUrl,
            notice: 'An account with this email exists but is not verified yet. A fresh verification code has been sent to your email.'
          }
        });
        return;
      }

      if (errorCode === 'ACCOUNT_EXISTS_VERIFIED' || errorAction === 'LOGIN') {
        const loginUrl = returnUrl !== '/dashboard'
          ? `/login?returnUrl=${encodeURIComponent(returnUrl)}`
          : '/login';
        setError(
          <span>
            This email is already registered and verified.{' '}
            <Link to={loginUrl} className="font-bold underline text-emerald-700 dark:text-emerald-400">
              Sign in here
            </Link>
          </span>
        );
        return;
      }

      const serverMsg = respData?.message || err.message || 'Registration failed. Please check details.';
      setError(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#f7f5f0] dark:bg-[#101216] text-stone-900 dark:text-stone-100 transition-colors duration-200">
      
      {/* Top Navbar */}
      <header className="w-full border-b border-[#e6e2d8] dark:border-[#272b34] bg-white/90 dark:bg-[#14171b]/90 backdrop-blur-md px-6 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 select-none group">
            <div className="w-8 h-8 rounded-lg bg-[#1a4231] text-white flex items-center justify-center font-bold shadow-xs">
              <Vote className="h-4 w-4 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-base tracking-tight text-stone-900 dark:text-white">
                  DigiVote
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 font-semibold">
                  REGISTRATION
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

            <div className="text-xs text-stone-600 dark:text-stone-400 font-sans">
              Already registered?{' '}
              <Link
                to="/login"
                className="font-semibold text-[#1a4231] dark:text-emerald-400 hover:underline"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Registration Container */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10">
        <div className="max-w-lg w-full space-y-6">
          
          {/* Card Box */}
          <div className="rounded-xl bg-white dark:bg-[#171a20] border border-[#e6e2d8] dark:border-[#272b34] p-6 sm:p-8 shadow-xs space-y-5 font-sans">
            
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-[#1a4231] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 text-[11px] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>DigiVote Account Registration</span>
              </div>
              <h1 className="font-display text-2xl font-bold text-stone-900 dark:text-white tracking-tight">
                Create Account
              </h1>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                Register once to manage elections and participate in eligible contests from one secure workspace.
              </p>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 font-sans">
              
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full pl-9 pr-4 py-2 rounded-lg text-xs bg-[#fdfcfb] dark:bg-[#14171b] border border-[#e6e2d8] dark:border-[#272b34] text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#1a4231] focus:border-[#1a4231] transition-all font-sans"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@institution.edu"
                    className="w-full pl-9 pr-4 py-2 rounded-lg text-xs bg-[#fdfcfb] dark:bg-[#14171b] border border-[#e6e2d8] dark:border-[#272b34] text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#1a4231] focus:border-[#1a4231] transition-all font-sans"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-4 py-2 rounded-lg text-xs bg-[#fdfcfb] dark:bg-[#14171b] border border-[#e6e2d8] dark:border-[#272b34] text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#1a4231] focus:border-[#1a4231] transition-all font-sans"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimum 8 characters"
                    className="w-full pl-9 pr-10 py-2 rounded-lg text-xs bg-[#fdfcfb] dark:bg-[#14171b] border border-[#e6e2d8] dark:border-[#272b34] text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#1a4231] focus:border-[#1a4231] transition-all font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {formData.password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-stone-500 dark:text-stone-400">
                      <span>Password Strength</span>
                      <span className="font-mono uppercase">{strengthLabels[strength]}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`rounded-full transition-all ${
                            strength >= level ? strengthColors[strength] : 'bg-stone-200 dark:bg-stone-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Re-enter password"
                    className="w-full pl-9 pr-10 py-2 rounded-lg text-xs bg-[#fdfcfb] dark:bg-[#14171b] border border-[#e6e2d8] dark:border-[#272b34] text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#1a4231] focus:border-[#1a4231] transition-all font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#1a4231] hover:bg-[#143325] text-white disabled:opacity-50 px-5 py-2.5 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue to Verification</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

            </form>

            <div className="text-[11px] text-stone-500 dark:text-stone-400 text-center leading-relaxed">
              By registering, you agree to digital election integrity standards and voter confidentiality guidelines.
            </div>

          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-stone-500 dark:text-stone-400 border-t border-[#e6e2d8] dark:border-[#272b34]">
        &copy; {new Date().getFullYear()} DigiVote Secure Digital Voting Platform
      </footer>

    </div>
  );
}

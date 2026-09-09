import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Eye, EyeOff, Loader2, ArrowRight, ShieldCheck, Mail, Lock } from 'lucide-react';
import { login } from '../../api/auth';
import GoogleAuthButton from './GoogleAuthButton';
import LockoutBanner from '../common/LockoutBanner';

export default function LoginForm() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberDevice: false,
  });

  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [warningMessage, setWarningMessage] = useState(null);
  const [isEmailUnverified, setIsEmailUnverified] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(null);

  // Real-time client-side validation
  const validationErrors = useMemo(() => {
    const errors = {};

    if (!formData.email.trim()) {
      errors.email = 'Registered email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email address format.';
    }

    if (!formData.password) {
      errors.password = 'Account password is required.';
    }

    return errors;
  }, [formData]);

  const isValid = Object.keys(validationErrors).length === 0;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setWarningMessage(null);
    setIsEmailUnverified(false);

    setTouched({
      email: true,
      password: true,
    });

    if (!isValid) {
      triggerShake();
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await login({
        email: formData.email.trim(),
        password: formData.password,
        remember_device: formData.rememberDevice,
      });

      // Successful password verification: redirect to Module 5 (OTP stub) with pre-auth context
      navigate('/verify-otp', {
        state: {
          email: formData.email.trim(),
          preAuthToken: response.pre_auth_token,
          destination: response.destination,
          rememberDevice: formData.rememberDevice,
        },
      });
    } catch (err) {
      triggerShake();

      if (err.code === 'ACCOUNT_LOCKED') {
        const lockoutTime = err.locked_until || new Date(Date.now() + 15 * 60 * 1000).toISOString();
        setLockedUntil(lockoutTime);
        setErrorMessage(null);
      } else if (err.code === 'EMAIL_VERIFICATION_REQUIRED') {
        setIsEmailUnverified(true);
        setErrorMessage(err.message || 'Please verify your email before logging in.');
      } else if (err.code === 'ACCOUNT_SUSPENDED') {
        setErrorMessage(err.message || 'This account has been suspended. Please contact Election Commission support.');
      } else if (err.status === 429) {
        setErrorMessage('Too many login attempts from this network. Please wait 60 seconds before trying again.');
      } else {
        // Generic timing-safe error for bad credentials
        setErrorMessage(err.message || 'Invalid email or password. Please verify your credentials.');
        if (err.warning) {
          setWarningMessage(err.warning);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFieldValid = (field) => touched[field] && !validationErrors[field];
  const getFieldError = (field) => touched[field] && validationErrors[field];

  return (
    <form onSubmit={handleSubmit} noValidate className={`space-y-4 ${isShaking ? 'animate-shake' : ''}`}>
      
      {/* Lockout Banner Countdown (Module 2/6) */}
      {lockedUntil && (
        <LockoutBanner
          lockedUntil={lockedUntil}
          onUnlock={() => {
            setLockedUntil(null);
            setErrorMessage(null);
          }}
          className="mb-4"
        />
      )}

      {/* 1. Primary Error Alert */}
      {errorMessage && !lockedUntil && (
        <div
          role="alert"
          className="p-3 bg-red-50 border-l-4 border-red-600 text-red-800 text-xs rounded-r flex items-start gap-2.5 shadow-sm"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold">{errorMessage}</span>
            {isEmailUnverified && (
              <div className="pt-1">
                <Link
                  to="/verify-email"
                  state={{ email: formData.email.trim() }}
                  className="font-bold underline text-red-900 hover:text-red-950 inline-flex items-center gap-1"
                >
                  Resend verification email &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Security Attempt Warning */}
      {warningMessage && (
        <div
          role="alert"
          className="p-3 bg-amber-50 border-l-4 border-amber-600 text-amber-900 text-xs rounded-r flex items-start gap-2.5 shadow-sm"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-950">Security Caution</p>
            <p className="text-amber-900 text-[11px] mt-0.5">{warningMessage}</p>
          </div>
        </div>
      )}

      {/* Email Address */}
      <div className="space-y-1">
        <label htmlFor="email" className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
          Registered Email Address <span className="text-red-600">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Mail className="h-4 w-4" />
          </div>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="voter@gov.in"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={!!getFieldError('email')}
            aria-describedby={getFieldError('email') ? 'email-error' : undefined}
            className={`w-full pl-9 pr-3 py-2 text-sm bg-white text-slate-900 border rounded focus:outline-none transition-colors ${
              getFieldError('email')
                ? 'border-red-500 bg-red-50/20'
                : isFieldValid('email')
                ? 'border-emerald-600'
                : 'border-slate-300 focus:border-[#0d2847] focus:ring-1 focus:ring-[#0d2847]'
            }`}
          />
        </div>
        {getFieldError('email') && (
          <p id="email-error" className="text-[11px] font-semibold text-red-600">
            {getFieldError('email')}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
            Password <span className="text-red-600">*</span>
          </label>
          
          {/* Forgot Password Stub (Module 4/6) */}
          <span
            className="text-[11px] font-semibold text-slate-400 cursor-not-allowed select-none"
            title="Password recovery service will be available in upcoming update."
          >
            Forgot Password?
          </span>
        </div>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Lock className="h-4 w-4" />
          </div>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={!!getFieldError('password')}
            aria-describedby={getFieldError('password') ? 'password-error' : undefined}
            className={`w-full pl-9 pr-9 py-2 text-sm bg-white text-slate-900 border rounded focus:outline-none transition-colors ${
              getFieldError('password')
                ? 'border-red-500 bg-red-50/20'
                : isFieldValid('password')
                ? 'border-emerald-600'
                : 'border-slate-300 focus:border-[#0d2847] focus:ring-1 focus:ring-[#0d2847]'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-slate-800"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        {getFieldError('password') && (
          <p id="password-error" className="text-[11px] font-semibold text-red-600">
            {getFieldError('password')}
          </p>
        )}
      </div>

      {/* Remember Device Checkbox */}
      <div className="flex items-center gap-2 pt-1">
        <input
          id="rememberDevice"
          name="rememberDevice"
          type="checkbox"
          checked={formData.rememberDevice}
          onChange={handleChange}
          className="h-4 w-4 text-[#0d2847] border-slate-300 rounded focus:ring-[#0d2847] cursor-pointer"
        />
        <label htmlFor="rememberDevice" className="text-xs text-slate-700 select-none cursor-pointer font-medium">
          Remember this device for 30 days
        </label>
      </div>

      {/* Trust Guarantee Note */}
      <div className="p-2.5 bg-blue-50/70 border border-blue-200 text-slate-700 text-[11px] rounded leading-relaxed flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-[#0d2847] shrink-0 mt-0.5" />
        <span>
          DigiVote requires two-factor validation. After entering your password, you will receive a sovereign verification code (OTP).
        </span>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded font-bold text-sm text-white bg-[#0d2847] hover:bg-[#07192d] active:bg-[#040e1a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying Credentials...</span>
            </>
          ) : (
            <>
              <span>Sign In with Password</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* OR DIVIDER */}
      <div className="relative flex items-center justify-center my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <span className="relative bg-white px-3 text-[10px] uppercase font-bold text-slate-400 select-none">
          Or Authenticate With
        </span>
      </div>

      {/* Google Sign-in Real Integration (Module 3) */}
      <div className="pt-1">
        <GoogleAuthButton disabled={isSubmitting} text="Sign in with Google" />
      </div>

    </form>
  );
}

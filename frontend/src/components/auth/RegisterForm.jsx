import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Check, AlertCircle, Eye, EyeOff, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import PasswordStrengthMeter from './PasswordStrengthMeter';
import { register } from '../../api/auth';

export default function RegisterForm() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    password: '',
    confirmPassword: '',
  });

  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isShaking, setIsShaking] = useState(false);

  // Real-time client validation
  const validationErrors = useMemo(() => {
    const errors = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Full Name as per official ID is required.';
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = 'Minimum 2 characters required.';
    }

    if (!formData.email.trim()) {
      errors.email = 'Official email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }

    const cleanedMobile = formData.mobileNumber.replace(/\s+/g, '').replace(/-/g, '');
    if (!cleanedMobile) {
      errors.mobileNumber = '10-Digit Mobile Number is required for OTP.';
    } else if (!/^(\+?[0-9]{1,3})?[0-9]{10}$/.test(cleanedMobile)) {
      errors.mobileNumber = 'Enter a valid 10-digit mobile number.';
    }

    if (!formData.password) {
      errors.password = 'Password is required.';
    } else {
      const p = formData.password;
      const valid = p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/`~]/.test(p);
      if (!valid) {
        errors.password = 'Password must satisfy all security rules.';
      }
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Password confirmation is required.';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    return errors;
  }, [formData]);

  const isValid = Object.keys(validationErrors).length === 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    setTouched({
      fullName: true,
      email: true,
      mobileNumber: true,
      password: true,
      confirmPassword: true,
    });

    if (!isValid) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        full_name: formData.fullName.trim(),
        email: formData.email.trim(),
        mobile_number: formData.mobileNumber.trim().replace(/\s+/g, '').replace(/-/g, ''),
        password: formData.password,
        confirm_password: formData.confirmPassword,
      });

      navigate('/verify-email', {
        state: {
          email: formData.email.trim(),
          registered: true,
        },
      });
    } catch (err) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);

      if (err.field) {
        const fieldKey = err.field === 'mobile_number' ? 'mobileNumber' : err.field === 'full_name' ? 'fullName' : err.field;
        setFieldErrors({ [fieldKey]: err.message });
      } else {
        setServerError(err.message || 'Registration failed. Please verify the information and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFieldValid = (field) => touched[field] && !validationErrors[field] && !fieldErrors[field];
  const getFieldError = (field) => (touched[field] && validationErrors[field]) || fieldErrors[field];

  return (
    <form onSubmit={handleSubmit} noValidate className={`space-y-4 ${isShaking ? 'animate-shake' : ''}`}>
      
      {serverError && (
        <div className="p-3 bg-red-50 border-l-4 border-red-600 text-red-800 text-xs flex items-start gap-2 rounded-r">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Full Legal Name */}
      <div className="space-y-1">
        <label htmlFor="fullName" className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
          Full Legal Name (as per EPIC / Voter Card) <span className="text-red-600">*</span>
        </label>
        <div className="relative">
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            autoComplete="name"
            placeholder="Enter full legal name"
            value={formData.fullName}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 text-sm bg-white text-slate-900 border rounded focus:outline-none transition-colors ${
              getFieldError('fullName')
                ? 'border-red-500 bg-red-50/20'
                : isFieldValid('fullName')
                ? 'border-emerald-600'
                : 'border-slate-300 focus:border-[#0d2847] focus:ring-1 focus:ring-[#0d2847]'
            }`}
          />
          {isFieldValid('fullName') && (
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-emerald-600">
              <Check className="h-4 w-4 stroke-[2.5]" />
            </div>
          )}
        </div>
        {getFieldError('fullName') && (
          <p className="text-[11px] font-semibold text-red-600">{getFieldError('fullName')}</p>
        )}
      </div>

      {/* Email Address & Mobile Number in 2 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Email */}
        <div className="space-y-1">
          <label htmlFor="email" className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
            Email Address <span className="text-red-600">*</span>
          </label>
          <div className="relative">
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
              className={`w-full px-3 py-2 text-sm bg-white text-slate-900 border rounded focus:outline-none transition-colors ${
                getFieldError('email')
                  ? 'border-red-500 bg-red-50/20'
                  : isFieldValid('email')
                  ? 'border-emerald-600'
                  : 'border-slate-300 focus:border-[#0d2847] focus:ring-1 focus:ring-[#0d2847]'
              }`}
            />
            {isFieldValid('email') && (
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-emerald-600">
                <Check className="h-4 w-4 stroke-[2.5]" />
              </div>
            )}
          </div>
          {getFieldError('email') && (
            <div className="flex items-center justify-between text-[11px] font-semibold text-red-600">
              <span>{getFieldError('email')}</span>
              {getFieldError('email').includes('already registered') && (
                <Link to="/login" className="underline font-bold text-[#0d2847] hover:text-blue-900">
                  Log In
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Mobile Number */}
        <div className="space-y-1">
          <label htmlFor="mobileNumber" className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
            Mobile Number (for OTP) <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <input
              id="mobileNumber"
              name="mobileNumber"
              type="tel"
              required
              autoComplete="tel"
              placeholder="10-digit mobile number"
              value={formData.mobileNumber}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full px-3 py-2 text-sm bg-white text-slate-900 border rounded focus:outline-none transition-colors ${
                getFieldError('mobileNumber')
                  ? 'border-red-500 bg-red-50/20'
                  : isFieldValid('mobileNumber')
                  ? 'border-emerald-600'
                  : 'border-slate-300 focus:border-[#0d2847] focus:ring-1 focus:ring-[#0d2847]'
              }`}
            />
            {isFieldValid('mobileNumber') && (
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-emerald-600">
                <Check className="h-4 w-4 stroke-[2.5]" />
              </div>
            )}
          </div>
          {getFieldError('mobileNumber') && (
            <p className="text-[11px] font-semibold text-red-600">{getFieldError('mobileNumber')}</p>
          )}
        </div>
      </div>

      {/* Passwords in 2 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Password */}
        <div className="space-y-1">
          <label htmlFor="password" className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
            Set Password <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full pl-3 pr-9 py-2 text-sm bg-white text-slate-900 border rounded focus:outline-none transition-colors ${
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
        </div>

        {/* Confirm Password */}
        <div className="space-y-1">
          <label htmlFor="confirmPassword" className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
            Confirm Password <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              className={`w-full pl-3 pr-9 py-2 text-sm bg-white text-slate-900 border rounded focus:outline-none transition-colors ${
                getFieldError('confirmPassword')
                  ? 'border-red-500 bg-red-50/20'
                  : isFieldValid('confirmPassword')
                  ? 'border-emerald-600'
                  : 'border-slate-300 focus:border-[#0d2847] focus:ring-1 focus:ring-[#0d2847]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-slate-800"
              aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
            >
              {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {(getFieldError('password') || getFieldError('confirmPassword')) && (
        <p className="text-[11px] font-semibold text-red-600">
          {getFieldError('password') || getFieldError('confirmPassword')}
        </p>
      )}

      {/* Password Checklist */}
      <PasswordStrengthMeter password={formData.password} />

      {/* Statutory Consent */}
      <div className="p-2.5 bg-blue-50/70 border border-blue-200 text-slate-700 text-[11px] rounded leading-relaxed flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-[#0d2847] shrink-0 mt-0.5" />
        <span>
          By registering, I declare that the details provided are accurate and correspond to my legal citizen identity under the National Election Commission rules.
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
              <span>Verifying & Registering Citizen Profile...</span>
            </>
          ) : (
            <>
              <span>Submit Registration</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

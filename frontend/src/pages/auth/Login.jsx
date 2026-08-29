import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import GoogleLoginButton from '../../components/auth/GoogleLoginButton';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Login() {
  const { login, googleLogin } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const validate = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'Registered email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!formData.password) {
      newErrors.password = 'Account password is required.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validate()) return;

    setIsLoading(true);
    try {
      const res = await login(formData.email, formData.password);
      if (res.otpRequired) {
        showSuccess('One-Time Password dispatched to your registered email.');
        navigate('/verify-email', { state: { email: formData.email } });
      } else if (res.success) {
        showSuccess('Authenticated successfully.');
        navigate('/register');
      }
    } catch (err) {
      const errorMessage = err.message || err.response?.data?.message ||
        'Authentication service is currently unavailable. Please check your credentials.';
      setSubmitError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential) => {
    setSubmitError('');
    setIsGoogleLoading(true);
    try {
      const res = await googleLogin(credential);
      if (res.otpRequired) {
        showSuccess('Google identity verified. OTP sent to your email.');
        navigate('/verify-email', { state: { email: res.email } });
      } else {
        showSuccess('Google sign-in successful.');
        navigate('/register');
      }
    } catch (err) {
      setSubmitError(
        err.message || 'Google authentication failed. Please try again.'
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleError = (errorMsg) => {
    setSubmitError(errorMsg || 'Google Sign-In failed. Please try again.');
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f9] text-slate-800 flex flex-col font-sans">
      
      {/* 1. TOP NATIONAL STRIP */}
      <div className="w-full h-1.5 bg-gradient-to-r from-[#f47c20] via-white to-[#11783e]" />
      
      {/* 2. ECI OFFICIAL HEADER BAR */}
      <header className="w-full bg-[#0d2847] text-white shadow-md border-b border-[#183e68]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          
          <Link to="/" className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-amber-300">
              <svg className="w-7 h-7 fill-current text-amber-300" viewBox="0 0 24 24">
                <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4zm0 3.18l6 3v4.82c0 4.38-2.92 8.48-6 9.6-3.08-1.12-6-5.22-6-9.6V8.18l6-3zM11 7h2v6h-2zm0 8h2v2h-2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-bold tracking-tight font-serif text-white">
                  भारत निर्वाचन आयोग
                </span>
                <span className="hidden md:inline-block text-[11px] font-bold px-2 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded">
                  ECI VOTER SERVICES
                </span>
              </div>
              <p className="text-xs text-slate-200 font-medium">
                Election Commission of India — DigiVote Sovereign Portal
              </p>
            </div>
          </Link>

          <Link
            to="/register"
            className="px-4 py-1.5 rounded bg-[#f47c20] hover:bg-[#e06910] text-white font-bold text-xs uppercase tracking-wide transition-colors shadow-sm"
          >
            Register Profile
          </Link>
        </div>
      </header>

      {/* 3. MAIN SIGN IN CONTAINER */}
      <main className="max-w-md w-full mx-auto my-auto px-4 py-12 flex-grow flex items-center">
        <div className="w-full bg-white rounded-lg border border-[#d4e0eb] shadow-sm overflow-hidden">
          
          <div className="bg-[#f8fafc] border-b border-[#d4e0eb] p-5 text-center">
            <span className="text-[10px] font-bold text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded uppercase">
              Citizen Access
            </span>
            <h2 className="text-xl font-bold font-serif text-[#0d2847] mt-1.5">
              Sign In to DigiVote
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your credentials or authenticate via verified Google ID.
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-4">
            
            {submitError && (
              <div className="p-3 bg-red-50 border-l-4 border-red-600 text-red-800 text-xs flex items-start gap-2 rounded-r">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Registered Email Address <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="voter@gov.in"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white text-slate-900 border border-slate-300 rounded focus:outline-none focus:border-[#0d2847] focus:ring-1 focus:ring-[#0d2847]"
                />
                {errors.email && <p className="text-[11px] font-semibold text-red-600">{errors.email}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Password <span className="text-red-600">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white text-slate-900 border border-slate-300 rounded focus:outline-none focus:border-[#0d2847] focus:ring-1 focus:ring-[#0d2847]"
                />
                {errors.password && <p className="text-[11px] font-semibold text-red-600">{errors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded font-bold text-sm text-white bg-[#0d2847] hover:bg-[#07192d] disabled:opacity-50 transition-colors shadow"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In with Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* OR DIVIDER */}
            <div className="relative flex items-center justify-center my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <span className="relative bg-white px-3 text-[10px] uppercase font-bold text-slate-400 select-none">
                Or Authenticate With
              </span>
            </div>

            {/* GOOGLE OAUTH BUTTON */}
            <GoogleLoginButton
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              isLoading={isGoogleLoading}
              disabled={isLoading}
            />

          </div>

          <div className="bg-[#f8fafc] border-t border-[#d4e0eb] p-4 text-center text-xs text-slate-600">
            <span>New citizen on DigiVote? </span>
            <Link to="/register" className="font-bold text-[#0d2847] hover:underline">
              Create New Registration
            </Link>
          </div>
        </div>
      </main>

      {/* 4. FOOTER */}
      <footer className="w-full bg-[#0d2847] text-white border-t-4 border-[#f47c20] py-4 text-center text-xs">
        <p className="text-slate-300 text-[11px]">
          &copy; {new Date().getFullYear()} Election Commission of India &bull; DigiVote Sovereign Digital Democracy Network
        </p>
      </footer>
    </div>
  );
}

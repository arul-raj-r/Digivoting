import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../utils/api';
import { ShieldCheck, Mail, Lock, KeyRound, AlertTriangle } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const loginStore = useAuthStore();
  
  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // Status states
  const [step, setStep] = useState<'LOGIN' | 'OTP' | 'CARD'>('LOGIN'); // LOGIN, OTP, or CARD
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Timer for OTP cooldown resend countdown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Username and password are required.');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/login/', { username, password });
      const { access, refresh, user, voter_profile } = response.data;
      
      // Store in Zustand
      loginStore.login(access, refresh, user, voter_profile);
      
      // Redirect based on role
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/verify/', { username, otp_code: otpCode });
      
      if (response.data.status === 'CARD_VERIFICATION_REQUIRED') {
        setPhotoPreview(response.data.photo_preview_url);
        setStep('CARD');
        return;
      }
      
      const { access, refresh, user, voter_profile } = response.data;
      
      // Store in Zustand
      loginStore.login(access, refresh, user, voter_profile);
      
      // Redirect based on role
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber) {
      setError('Please enter your Voter Card Number.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/verify-card/', { username, card_number: cardNumber });
      const { access, refresh, user, voter_profile } = response.data;
      
      // Store in Zustand
      loginStore.login(access, refresh, user, voter_profile);
      
      // Redirect
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Card verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login/', { username, password });
      if (response.data.status === 'OTP_REQUIRED') {
        setError('A new verification code has been generated.');
        setCooldown(60);
        setOtpCode('');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6 sm:p-8 space-y-6">
      
      {/* Brand Icon & Heading */}
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 bg-gov-blue/10 dark:bg-gov-gold/10 text-gov-blue dark:text-gov-gold rounded-full">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {step === 'LOGIN' ? 'Sign In to Portal' : step === 'OTP' ? 'Enter Verification Code' : 'Verify Voter Identity Card'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {step === 'LOGIN' 
            ? 'Use your registered credentials to sign in.' 
            : step === 'OTP'
            ? `We sent a 6-digit OTP code for '${username}'.`
            : 'Confirm ownership of your Digital Voter ID Card'
          }
        </p>
      </div>

      {error && (
        <div className={`p-3 text-xs rounded-lg font-semibold flex items-center gap-2 ${error.includes('generated') || error.includes('sent') ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'}`}>
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {step === 'LOGIN' ? (
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350">
              Username or Voter ID
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Mail className="h-4 w-4" />
              </span>
              <input 
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. voter123"
                className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lock className="h-4 w-4" />
              </span>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gov-blue hover:bg-gov-darkblue text-white rounded-lg text-sm font-bold shadow-md shadow-gov-blue/20 transition-all disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      ) : step === 'OTP' ? (
        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350">
              6-Digit OTP Code
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <KeyRound className="h-4 w-4" />
              </span>
              <input 
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit code"
                className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-center tracking-widest font-mono text-lg"
                required
              />
            </div>
          </div>

          {/* Academic/Console Alert */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/50 rounded-lg text-[10px] text-amber-800 dark:text-amber-300 leading-relaxed space-y-1">
            <div className="font-bold flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span>DEVELOPER DEMO OTP NOTICE</span>
            </div>
            <p>
              Since email servers are disabled in this prototype, OTP codes are logged directly to the **Django command prompt terminal window** in the format:
              `[DEMO OTP] Verification code for '...'`.
            </p>
          </div>

          <button 
            type="submit"
            disabled={loading || otpCode.length !== 6}
            className="w-full py-2.5 bg-gov-blue hover:bg-gov-darkblue text-white rounded-lg text-sm font-bold shadow-md transition-all disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Verify & Sign In'}
          </button>

          <div className="flex items-center justify-between text-xs pt-2">
            <button
              type="button"
              onClick={() => {
                setStep('LOGIN');
                setError(null);
                setOtpCode('');
              }}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              ← Back to password
            </button>
            
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading || cooldown > 0}
              className="text-gov-blue dark:text-gov-gold hover:underline disabled:opacity-40 disabled:hover:no-underline font-semibold"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleCardSubmit} className="space-y-4">
          <div className="space-y-3 flex flex-col items-center">
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350 self-start">
              Registered Photo Preview
            </span>
            {/* Blurred photo frame */}
            <div className="w-[100px] h-[130px] bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg overflow-hidden flex items-center justify-center shadow-sm shrink-0">
              {photoPreview ? (
                <img 
                  src={photoPreview} 
                  alt="Voter Identity Preview" 
                  className="w-full h-full object-cover scale-x-[-1] blur-[3px]" 
                />
              ) : (
                <div className="text-slate-400 font-bold text-[10px]">No Photo</div>
              )}
            </div>
            <p className="text-[10px] text-slate-500 text-center max-w-[280px]">
              This is a partial preview of your registered photo. Please confirm your physical identity by entering your Voter Card Number below.
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-350">
              Voter ID Card Number
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <ShieldCheck className="h-4 w-4 text-gov-blue dark:text-gov-gold" />
              </span>
              <input 
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value.toUpperCase())}
                placeholder="e.g. ABC1234567"
                className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-mono tracking-widest text-center uppercase"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading || !cardNumber}
            className="w-full py-2.5 bg-gov-blue hover:bg-gov-darkblue text-white rounded-lg text-sm font-bold shadow-md transition-all disabled:opacity-50"
          >
            {loading ? 'Verifying Card...' : 'Confirm Card & Sign In'}
          </button>

          <div className="flex items-center text-xs pt-2">
            <button
              type="button"
              onClick={() => {
                setStep('OTP');
                setError(null);
                setCardNumber('');
              }}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              ← Back to OTP verification
            </button>
          </div>
        </form>
      )}

      {/* Footer Registration Redirect */}
      <div className="text-center text-xs border-t border-slate-100 dark:border-slate-850 pt-4 text-slate-500 dark:text-slate-400">
        New voter?{' '}
        <Link to="/register" className="text-gov-blue dark:text-gov-gold font-bold hover:underline">
          Create voter profile here
        </Link>
      </div>

    </div>
  );
};

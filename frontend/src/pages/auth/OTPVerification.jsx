import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { KeyRound } from 'lucide-react';

export default function OTPVerification() {
  const { verifyOtp, pendingUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [attempts, setAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleChange = (index, value) => {
    setErrorMsg('');
    const newOtp = [...otp];
    // Keep only the last character entered
    const char = value.substring(value.length - 1);
    newOtp[index] = char;
    setOtp(newOtp);

    // Auto-focus next input
    if (char && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      setErrorMsg('');
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1].focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    setErrorMsg('');
    const pasteData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasteData)) {
      const digits = pasteData.split('');
      setOtp(digits);
      inputRefs.current[5].focus();
    }
  };

  const handleResend = () => {
    setTimer(60);
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0].focus();
    showSuccess('A new verification code has been dispatched.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    const code = otp.join('');
    if (code.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsLoading(true);
    setAttempts((prev) => prev + 1);

    try {
      const res = await verifyOtp(code);
      if (res.success) {
        showSuccess('Verification code cleared. Welcome to DigiVote.');
        navigate(res.role === 'ADMIN' ? '/admin' : '/dashboard', { replace: true });
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Invalid verification code. Access denied.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="h-12 w-12 rounded-full bg-gov-blue/10 dark:bg-gov-slate/10 flex items-center justify-center text-gov-blue dark:text-gov-slate">
          <KeyRound className="h-6 w-6" />
        </div>
      </div>

      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold">Two-Factor Authentication</h2>
        <p className="text-xs text-slate-500">
          Enter the 6-digit verification code sent to your registered contact.
        </p>
      </div>

      {errorMsg && <Alert type="error">{errorMsg}</Alert>}
      
      {attempts >= 2 && (
        <Alert type="warning">
          Attempt limit caution. Account lockout triggers after multiple failures.
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* OTP Input Fields */}
        <div className="flex justify-between gap-2" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="h-12 w-12 text-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-gov-cardDark text-base font-bold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gov-blue dark:focus:ring-gov-gold transition-all"
              required
            />
          ))}
        </div>

        <div className="text-center text-xs space-y-2">
          <p className="text-slate-400 font-medium">
            "Never share your verification code with anyone."
          </p>
          <div className="pt-2">
            {timer > 0 ? (
              <span className="text-slate-450">
                Resend code available in <span className="font-bold">{timer}s</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="font-bold text-gov-blue dark:text-gov-slate hover:underline"
              >
                Resend Verification Code
              </button>
            )}
          </div>
        </div>

        <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
          Verify & Access
        </Button>
      </form>
    </div>
  );
}

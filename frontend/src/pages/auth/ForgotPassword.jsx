import { useState } from 'react';
import { Link } from 'react-router-dom';
import Input from '../../components/forms/Input';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import { authService } from '../../services/authService';
import { useToast } from '../../context/ToastContext';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { showSuccess } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please provide your registered email address.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.requestPasswordReset(email);
      setSuccess(true);
      showSuccess('Password reset link sent.');
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Password reset services are currently offline. Please try again later.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6 text-center">
        <h2 className="text-xl font-bold">Check Your Email</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          A reset link has been dispatched to <span className="font-bold text-slate-805 dark:text-slate-200">{email}</span>. Click the link inside the email to establish a new password.
        </p>
        <Link to="/login" className="block pt-4">
          <Button variant="primary" className="w-full">
            Return to Login
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">Reset Password</h2>
        <p className="text-xs text-slate-500">
          Enter your email to receive a password reset verification link.
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voter@domain.com"
          required
        />
        <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
          Send Reset Link
        </Button>
      </form>

      <div className="text-center text-xs text-slate-505 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4">
        <Link to="/login" className="font-bold text-gov-blue dark:text-gov-slate hover:underline">
          Return to Login
        </Link>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import PasswordInput from '../../components/forms/PasswordInput';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import { authService } from '../../services/authService';
import { useToast } from '../../context/ToastContext';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { showSuccess } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Password reset token is invalid or missing.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(token, password);
      showSuccess('Your password has been updated.');
      navigate('/login');
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Failed to update password. Reset session may have expired.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">New Password</h2>
        <p className="text-xs text-slate-500">Configure a new secure password for your account.</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {!token && (
        <Alert type="warning">
          Missing token. Make sure you accessed this page from the email link.
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordInput
          label="New Password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimum 8 characters"
          required
          disabled={!token}
        />
        <PasswordInput
          label="Confirm Password"
          id="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          required
          disabled={!token}
        />
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          isLoading={isLoading}
          disabled={!token}
        >
          Update Password
        </Button>
      </form>
    </div>
  );
}

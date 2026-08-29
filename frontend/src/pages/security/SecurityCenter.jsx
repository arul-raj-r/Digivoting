import { useState } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/forms/Input';
import Alert from '../../components/common/Alert';
import StatusBadge from '../../components/common/StatusBadge';
import { userService } from '../../services/userService';
import { useToast } from '../../context/ToastContext';

export default function SecurityCenter() {
  const { showSuccess, showError } = useToast();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await userService.changePassword({ oldPassword, newPassword });
      showSuccess('Password updated successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setErrorMsg('Failed to update password. Security service connection offline.');
    } finally {
      setIsLoading(false);
    }
  };

  // Demo active sessions - labeled as Demo data
  const activeSessions = [
    { device: 'Windows PC / Chrome Browser', location: 'New Delhi, India', status: 'ACTIVE', ip: '192.168.1.1' },
    { device: 'iPhone 15 / Safari', location: 'Mumbai, India', status: 'INACTIVE', ip: '192.168.1.2' }
  ];

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Security Management</h1>
        <p className="text-xs text-slate-505">Audit active sessions, update security locks, and manage passkeys.</p>
      </div>

      {errorMsg && <Alert type="warning">{errorMsg}</Alert>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Security Credentials Status">
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center py-2 border-b">
              <span>Two-Factor Authentication (OTP)</span>
              <StatusBadge status="ACTIVE" />
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span>Device Passkey (WebAuthn)</span>
              <StatusBadge status="PENDING" />
            </div>
            <div className="flex justify-between items-center py-2">
              <span>Face Verification Template</span>
              <StatusBadge status="PENDING" />
            </div>
          </div>
        </Card>

        <Card title="Update Account Password">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Current Password"
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
            <Input
              label="New Password"
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Input
              label="Confirm New Password"
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Update Password
            </Button>
          </form>
        </Card>
      </div>

      <Card title="Active Authenticated Sessions" subtitle="DEMO DATA — Devices authorized to access this account.">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {activeSessions.map((session, index) => (
            <div key={index} className="py-4 flex justify-between items-center text-xs">
              <div className="space-y-0.5">
                <p className="font-semibold text-slate-800 dark:text-slate-200">{session.device}</p>
                <p className="text-slate-450">{session.location} | IP: {session.ip}</p>
              </div>
              <StatusBadge status={session.status} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

import { useState } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/forms/Input';
import Alert from '../../components/common/Alert';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { userService } from '../../services/userService';

export default function Profile() {
  const { user, checkAuth } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [formData, setFormData] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone_number || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      await userService.updateProfile({
        full_name: formData.fullName,
      });
      showSuccess('Profile details updated successfully.');
      await checkAuth();
    } catch (err) {
      setErrorMsg('Updating profile data is currently unavailable on the backend REST API.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Voter Profile Settings</h1>
        <p className="text-xs text-slate-505">Manage your personal information and account preferences.</p>
      </div>

      {errorMsg && <Alert type="warning">{errorMsg}</Alert>}

      <Card title="Personal Information">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            id="fullName"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="Your full name"
            required
          />

          <Input
            label="Email Address"
            id="email"
            type="email"
            value={formData.email}
            disabled
            helperText="Email addresses are verified credentials and cannot be edited by the voter."
          />

          <Input
            label="Mobile Number"
            id="phone"
            type="tel"
            value={formData.phone}
            disabled
            helperText="Mobile numbers are verified and linked to two-factor locks."
          />

          <Button type="submit" variant="primary" isLoading={isLoading}>
            Save Changes
          </Button>
        </form>
      </Card>
    </div>
  );
}

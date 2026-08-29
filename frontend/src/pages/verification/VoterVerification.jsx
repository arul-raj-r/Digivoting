import { useState, useEffect } from 'react';
import { Landmark, MapPin, CheckCircle, ShieldAlert } from 'lucide-react';
import Card from '../../components/common/Card';
import Alert from '../../components/common/Alert';
import { voterService } from '../../services/voterService';

export default function VoterVerification() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchVoterProfile() {
      try {
        const data = await voterService.getVoterStatus();
        setProfile(data);
      } catch (e) {
        setError('Failed to fetch voter roll records.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchVoterProfile();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Electoral Registry Profile</h1>
        <p className="text-xs text-slate-500 mt-1">
          Verify your constituency and registered polling station details.
        </p>
      </div>

      {error && <Alert type="warning">{error}</Alert>}

      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gov-blue dark:border-gov-gold border-t-transparent"></div>
        </div>
      ) : profile?.is_eligible ? (
        <Card title="Electoral Roll Records" subtitle="Verification Complete">
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-350 border border-emerald-100 dark:border-emerald-900 rounded-lg">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <span className="text-xs font-semibold">Your voter eligibility is verified. You are clear to vote in active elections.</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">State</span>
                <p className="font-semibold text-slate-700 dark:text-slate-200">{profile.state || 'N/A'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">District</span>
                <p className="font-semibold text-slate-700 dark:text-slate-200">{profile.district || 'N/A'}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Constituency</span>
                <p className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Landmark className="h-4 w-4 text-gov-slate" />
                  {profile.constituency_name || 'N/A'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Polling Station</span>
                <p className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-gov-slate" />
                  {profile.polling_station || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card title="Eligibility Warning">
          <div className="space-y-6">
            <div className="flex items-start gap-3 p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-350 border border-rose-100 dark:border-rose-900 rounded-lg">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold">Your voter eligibility has not yet been verified.</p>
                <p className="leading-relaxed text-slate-500 dark:text-slate-400">
                  We could not map your account to any active constituency polling roll. Ensure you complete Identity Verification first.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

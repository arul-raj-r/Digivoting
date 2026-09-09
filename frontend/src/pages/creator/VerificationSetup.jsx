import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import electionsApi from '../../api/elections';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ErrorState from '../../components/common/ErrorState';
import { 
  Mail, 
  Camera, 
  Fingerprint, 
  Lock, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  Save
} from 'lucide-react';

export default function VerificationSetup() {
  const { id } = useParams();
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [requireEmailOtp, setRequireEmailOtp] = useState(false);
  const [requireWebcam, setRequireWebcam] = useState(false);
  const [requireBiometric, setRequireBiometric] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [electionData, configData] = await Promise.all([
        electionsApi.getElection(id),
        electionsApi.getVerificationConfig(id),
      ]);
      setElection(electionData);
      setRequireEmailOtp(!!configData.require_email_otp);
      setRequireWebcam(!!configData.require_webcam_verification);
      setRequireBiometric(!!configData.require_biometric_verification);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load verification settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-6">
        <LoadingSkeleton variant="header" />
        <LoadingSkeleton variant="cards" count={3} />
      </div>
    );
  }

  if (error || !election) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <ErrorState 
          title="Verification policy service unavailable" 
          message={error || 'Could not load verification settings for this election.'}
          onRetry={fetchData}
        />
      </div>
    );
  }

  const isLocked = election.is_locked || election.status !== 'draft';

  const handleSave = async (e) => {
    e.preventDefault();
    setSavedSuccess(false);
    setSaveError(null);

    if (isLocked) {
      setSaveError('Election configuration is locked. Verification policies cannot be modified.');
      return;
    }

    setSaving(true);
    try {
      await electionsApi.updateVerificationConfig(id, {
        require_email_otp: requireEmailOtp,
        require_webcam_verification: requireWebcam,
        require_biometric_verification: requireBiometric,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      setSaveError(
        err.response?.data?.error || 
        (typeof err.response?.data === 'object' ? JSON.stringify(err.response.data) : null) || 
        'Failed to save verification settings.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      
      {/* Back to Hub */}
      <div>
        <Link 
          to={`/creator/elections/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Election Command Center</span>
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                Module 3 of 8
              </span>
              {isLocked && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                  <Lock className="w-3 h-3" />
                  Policy Permanently Locked
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Member Verification Setup
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
              Configure identity verification gates required prior to unlocking ballot access for <span className="font-semibold text-slate-800 dark:text-slate-200">"{election.title}"</span>.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Verification policy settings saved and logged to audit trail.</span>
          </div>
        )}

        {saveError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}
      </div>

      {/* Toggles Form */}
      <form onSubmit={handleSave} className="space-y-4">
        
        {/* Gate 1: Email OTP */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
              <Mail className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Email One-Time Passcode (OTP)
                </h3>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                  Recommended
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
                Generates a cryptographically random numeric challenge sent to the member's registered email before ballot selection is unlocked.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              disabled={isLocked}
              checked={requireEmailOtp}
              onChange={(e) => setRequireEmailOtp(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600 dark:peer-checked:bg-sky-500"></div>
          </label>
        </div>

        {/* Gate 2: Webcam Verification Flag */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Camera className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Webcam Verification Flag
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
                Configures camera presence check. <span className="font-semibold text-amber-600 dark:text-amber-400">Notice:</span> If enabled, member voting booths without active webcam access will be blocked from voting.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              disabled={isLocked}
              checked={requireWebcam}
              onChange={(e) => setRequireWebcam(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600 dark:peer-checked:bg-sky-500"></div>
          </label>
        </div>

        {/* Gate 3: Biometric Verification Flag (Coming Soon) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Biometric Verification Flag
                </h3>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                  Coming soon — not yet enforced
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
                Organizational flag for dedicated biometric sensors. If enabled, voting will show a hardware requirement notice.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              disabled={isLocked}
              checked={requireBiometric}
              onChange={(e) => setRequireBiometric(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600 dark:peer-checked:bg-sky-500"></div>
          </label>
        </div>

        {/* Notice Box */}
        <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-3">
          <Info className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-slate-800 dark:text-slate-200">
              Organizational Verification Notice
            </p>
            <p className="text-[11px] leading-relaxed">
              These toggles configure verification requirements for voters in your organization. Enabling hardware gates (such as webcam verification) will actively restrict member voting access unless proper hardware is confirmed.
            </p>
          </div>
        </div>

        {/* Action Button */}
        {!isLocked && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 text-white shadow-md transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Verification Policies'}</span>
            </button>
          </div>
        )}

      </form>

    </div>
  );
}

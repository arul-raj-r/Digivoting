import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import electionsApi from '../../api/elections';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ErrorState from '../../components/common/ErrorState';
import { 
  Calendar, 
  Eye, 
  RefreshCw, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Lock,
  Save
} from 'lucide-react';

export default function ScheduleAndRules() {
  const { id } = useParams();
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Format ISO to local input datetime-local string
  const formatForInput = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  const [startDatetime, setStartDatetime] = useState('');
  const [endDatetime, setEndDatetime] = useState('');
  const [resultsVisibility, setResultsVisibility] = useState('manual');
  const [resultsVisibleAt, setResultsVisibleAt] = useState('');
  const [allowVoteChange, setAllowVoteChange] = useState(false);

  const [validationError, setValidationError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [electionData, rulesData] = await Promise.all([
        electionsApi.getElection(id),
        electionsApi.getElectionRules(id),
      ]);
      setElection(electionData);
      setStartDatetime(formatForInput(electionData.start_datetime));
      setEndDatetime(formatForInput(electionData.end_datetime));
      setResultsVisibility(rulesData.results_visibility || 'manual');
      setResultsVisibleAt(formatForInput(rulesData.results_visible_at));
      setAllowVoteChange(!!rulesData.allow_vote_change);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load schedule and rules.');
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
          title="Schedule registry unavailable"
          message={error || 'Could not load timetable or voting rule parameters for this election.'}
          onRetry={fetchData}
        />
      </div>
    );
  }

  const isLocked = election.is_locked && (election.status === 'active' || election.status === 'completed' || election.status === 'cancelled');

  const handleSave = async (e) => {
    e.preventDefault();
    setValidationError(null);
    setSaveSuccess(false);

    if (isLocked) {
      setValidationError('Election schedule is locked. Timetable cannot be altered once polling is active.');
      return;
    }

    if (!startDatetime || !endDatetime) {
      setValidationError('Both poll opening (start) and closing (end) dates/times are mandatory.');
      return;
    }

    const start = new Date(startDatetime);
    const end = new Date(endDatetime);

    if (end <= start) {
      setValidationError('Poll closing time must be strictly after the poll start time.');
      return;
    }

    let parsedResultsVisibleAt = null;
    if (resultsVisibility === 'scheduled') {
      if (!resultsVisibleAt) {
        setValidationError('A scheduled publication time is required when "Scheduled Release" is selected.');
        return;
      }
      const visDate = new Date(resultsVisibleAt);
      if (visDate <= end) {
        setValidationError('Results publication time must be strictly after poll closing time.');
        return;
      }
      parsedResultsVisibleAt = visDate.toISOString();
    }

    setSaving(true);
    try {
      // 1. Update rules first (while draft if applicable)
      if (election.status === 'draft') {
        await electionsApi.updateElectionRules(id, {
          results_visibility: resultsVisibility,
          results_visible_at: parsedResultsVisibleAt,
          allow_vote_change: allowVoteChange,
        });
      }

      // 2. Update election schedule and optionally transition to scheduled
      const electionPayload = {
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString(),
      };

      if (election.status === 'draft') {
        electionPayload.status = 'scheduled';
      }

      const updated = await electionsApi.updateElection(id, electionPayload);
      setElection(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      const resp = err.response?.data;
      const msg = resp?.error || (typeof resp === 'object' ? JSON.stringify(resp) : null) || err.message || 'Failed to update schedule.';
      setValidationError(msg);
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
                Module 4 of 8
              </span>
              {isLocked && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                  <Lock className="w-3 h-3" />
                  Schedule Locked
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Schedule & Polling Rules
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
              Configure official voting windows, ballot modification rules, and results publication timing for <span className="font-semibold text-slate-800 dark:text-slate-200">"{election.title}"</span>.
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Official timetable and rules updated successfully.</span>
          </div>
        )}

        {validationError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
      </div>

      {/* Form Card */}
      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Polling Timetable Section */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Official Voting Window
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Polls Open (Start Datetime) <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                disabled={isLocked}
                value={startDatetime}
                onChange={(e) => setStartDatetime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                Eligible members can access the polling booth from this time.
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Polls Close (End Datetime) <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                disabled={isLocked}
                value={endDatetime}
                onChange={(e) => setEndDatetime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                Voting closes automatically and ballots are sealed.
              </span>
            </div>
          </div>
        </div>

        {/* Results Visibility Disclosure Policy */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Results Publication Policy
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            {[
              {
                key: 'manual',
                title: 'Manual Creator Certification & Publish (Recommended)',
                desc: 'Results are staged for organizer review. Creator must explicitly click "Publish Results" after verifying tally.'
              },
              {
                key: 'immediate',
                title: 'Immediate Auto-Publish on Poll Close',
                desc: 'Tally is automatically made visible to all organization members as soon as official end datetime is reached.'
              },
              {
                key: 'scheduled',
                title: 'Scheduled Future Date & Time',
                desc: 'Results remain confidential until a pre-determined post-poll embargo timestamp expires.'
              }
            ].map(policy => (
              <label
                key={policy.key}
                onClick={() => !isLocked && election.status === 'draft' && setResultsVisibility(policy.key)}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  resultsVisibility === policy.key
                    ? 'border-sky-600 dark:border-sky-400 bg-sky-50/40 dark:bg-sky-950/30'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  disabled={isLocked || election.status !== 'draft'}
                  checked={resultsVisibility === policy.key}
                  onChange={() => setResultsVisibility(policy.key)}
                  className="mt-1"
                />
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    {policy.title}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block mt-0.5">
                    {policy.desc}
                  </span>
                </div>
              </label>
            ))}

            {/* Conditional Scheduled Date Picker */}
            {resultsVisibility === 'scheduled' && (
              <div className="pt-2 pl-4 border-l-2 border-sky-500 space-y-1">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  Scheduled Publication Datetime <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  disabled={isLocked || election.status !== 'draft'}
                  value={resultsVisibleAt}
                  onChange={(e) => setResultsVisibleAt(e.target.value)}
                  className="w-full sm:w-80 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
                <span className="text-[10px] text-slate-400 block">
                  Must be later than the poll close time.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Polling Rules: Allow Vote Change */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Allow Vote Modification Prior to Poll Close
                </h3>
                <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                  Optional Rule
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg">
                If enabled, a member who has already voted may submit an updated ballot before voting closes.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              disabled={isLocked || election.status !== 'draft'}
              checked={allowVoteChange}
              onChange={(e) => setAllowVoteChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600 dark:peer-checked:bg-sky-500"></div>
          </label>
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
              <span>{saving ? 'Saving...' : 'Save Schedule & Rules'}</span>
            </button>
          </div>
        )}

      </form>

    </div>
  );
}

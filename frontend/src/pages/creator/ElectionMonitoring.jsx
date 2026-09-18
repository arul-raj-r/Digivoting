import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import electionsApi from '../../api/elections';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ErrorState from '../../components/common/ErrorState';
import { 
  Users, 
  Clock, 
  RefreshCw, 
  ShieldCheck, 
  ArrowLeft, 
  Vote, 
  Percent, 
  Lock
} from 'lucide-react';

export default function ElectionMonitoring() {
  const { id } = useParams();
  const [monitoringData, setMonitoringData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMonitoring = async (isManual = false) => {
    if (isManual) setLoading(true);
    setError(null);
    try {
      const data = await electionsApi.getElectionMonitoring(id);
      setMonitoringData(data);
      setLastRefreshed(new Date());
    } catch (err) {
      if (isManual) {
        setError(err.response?.data?.error || err.message || 'Failed to load monitoring data.');
      }
    } finally {
      if (isManual) setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const initialLoad = async () => {
      setLoading(true);
      try {
        const data = await electionsApi.getElectionMonitoring(id);
        if (mounted) {
          setMonitoringData(data);
          setLastRefreshed(new Date());
        }
      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.error || err.message || 'Failed to load monitoring data.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    initialLoad();

    return () => {
      mounted = false;
    };
  }, [id]);

  // Auto-refresh interval every 10s while active
  useEffect(() => {
    let interval = null;
    if (autoRefresh && monitoringData?.current_status === 'active') {
      interval = setInterval(() => {
        fetchMonitoring(false);
      }, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, monitoringData?.current_status, id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        <LoadingSkeleton variant="header" />
        <LoadingSkeleton variant="metrics" count={4} />
      </div>
    );
  }

  if (error || !monitoringData) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <ErrorState 
          title="Monitoring telemetry unavailable"
          message={error || 'Could not retrieve turnout metrics for this election.'}
          onRetry={() => fetchMonitoring(true)}
        />
      </div>
    );
  }

  const totalEligible = monitoringData.total_eligible_voters || 0;
  const participated = monitoringData.voters_participated || 0;
  const turnoutPercent = monitoringData.participation_rate ?? (totalEligible > 0 ? Math.round((participated / totalEligible) * 100) : 0);

  // Time remaining format
  let timeRemaining = 'Polls concluded';
  if (monitoringData.current_status === 'active' && monitoringData.time_remaining_seconds !== null && monitoringData.time_remaining_seconds !== undefined) {
    const totalSec = monitoringData.time_remaining_seconds;
    if (totalSec > 0) {
      const hours = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      timeRemaining = `${hours}h ${mins}m remaining`;
    } else {
      timeRemaining = 'Closing time reached';
    }
  } else if (monitoringData.current_status === 'scheduled') {
    timeRemaining = 'Scheduled — not yet open';
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      
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

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                Module 6 of 8
              </span>
              <StatusBadge status={monitoringData.current_status} />
              {monitoringData.current_status === 'active' && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Live participation active" />
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              Live Turnout & Participation Monitoring
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
              Monitor member turnout in real time for <span className="font-semibold text-slate-800 dark:text-slate-200">"{monitoringData.title}"</span>.
            </p>
          </div>

          {/* Refresh controls */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => fetchMonitoring(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Refresh Now</span>
            </button>
            <span className="text-[11px] text-slate-400">
              Updated: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Turnout Metric Card */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Cumulative Turnout Rate
            </span>
            <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white block mt-1">
              {turnoutPercent}%
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {participated} of {totalEligible} eligible organization members have cast their votes.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-right space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Polling Window</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 justify-end">
              <Clock className="w-3.5 h-3.5 text-sky-500" />
              <span>{timeRemaining}</span>
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-700"
              style={{ width: `${Math.max(turnoutPercent, totalEligible > 0 ? 1 : 0)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 font-medium">
            <span>0%</span>
            <span>50% Quorum</span>
            <span>100% Turnout</span>
          </div>
        </div>
      </div>

      {/* Telemetry Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ballots Cast</span>
            <Vote className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white block">
            {participated}
          </span>
          <p className="text-[11px] text-slate-400">Encrypted in ballot database</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Eligible Members</span>
            <Users className="w-4 h-4 text-sky-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white block">
            {totalEligible}
          </span>
          <p className="text-[11px] text-slate-400">Total member roster count</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Remaining Votes</span>
            <Percent className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white block">
            {Math.max(0, totalEligible - participated)}
          </span>
          <p className="text-[11px] text-slate-400">Members yet to submit</p>
        </div>

      </div>

      {/* Secret Ballot Safeguard Notice */}
      <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-3.5">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white">
            Secret Ballot Safeguard Notice
          </h2>
          <p className="text-[11px] leading-relaxed">
            Live candidate tallies and vote choices are completely inaccessible during active voting hours. This protects member privacy and prevents premature outcome projections. Only aggregate voter turnout is displayed. Certified candidate tallies are calculated only after the election officially concludes.
          </p>
        </div>
      </div>

    </div>
  );
}
